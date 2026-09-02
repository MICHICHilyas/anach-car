import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { rm } from "node:fs/promises";
import path from "node:path";
import {
  createTestDb,
  createTestVehicle,
  day,
  resetDatabase,
} from "../setup/db";

/**
 * Parcours complet d'une demande envoyée depuis le site public, à travers la
 * vraie server action — validation, calcul du prix, création du client,
 * numérotation et garde-fou anti double réservation.
 */
const db = createTestDb();

vi.mock("@/lib/db", async () => {
  const { createTestDb } = await import("../setup/db");
  return { db: createTestDb() };
});

// La server action lit les en-têtes HTTP (adresse IP) : on les simule.
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1" }),
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

// Aucun email ne doit partir pendant les tests.
vi.mock("@/lib/mailer", () => ({ sendMail: async () => ({ sent: false }) }));

// Paramètres pilotés par les tests. `vi.hoisted` est indispensable : les
// appels à `vi.mock` sont remontés en haut du fichier, avant les constantes.
const settingsState = vi.hoisted(() => ({ requireDocuments: false }));

vi.mock("@/lib/settings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/settings")>(
    "@/lib/settings",
  );
  return {
    ...actual,
    getSettings: async () => ({
      ...actual.DEFAULT_SETTINGS,
      reservation: {
        ...actual.DEFAULT_SETTINGS.reservation,
        minAdvanceHours: 1,
        requireDocumentsAtBooking: settingsState.requireDocuments,
      },
    }),
  };
});

let vehicleId: string;

beforeAll(async () => {
  process.env.AUTH_SECRET = "secret-de-test-suffisamment-long-0123456789";
  process.env.STORAGE_DRIVER = "local";
  process.env.STORAGE_LOCAL_DIR = ".data/test-booking-uploads";
  await resetDatabase(db);
});

beforeEach(async () => {
  settingsState.requireDocuments = false;
  await db.document.deleteMany();

  // La limitation de débit est volontairement stricte (5 demandes / 10 min et
  // par IP). On la remet à zéro entre les tests, qui partagent tous la même
  // adresse simulée — un test dédié vérifie qu'elle fonctionne.
  const { resetRateLimit } = await import("@/lib/rate-limit");
  resetRateLimit("reservation:127.0.0.1");

  await db.reservation.deleteMany();
  await db.customer.deleteMany();
  await db.counter.deleteMany();
  const vehicle = await createTestVehicle(db, { dailyRate: 25000 });
  vehicleId = vehicle.id;
});

afterAll(async () => {
  await resetDatabase(db);
  await rm(path.resolve(process.cwd(), ".data/test-booking-uploads"), {
    recursive: true,
    force: true,
  });
  await db.$disconnect();
});

function isoDate(offset: number): string {
  const date = new Date(Date.now() + offset * 86400000);
  return date.toISOString().slice(0, 10);
}

const baseInput = () => ({
  vehicleId,
  startDate: isoDate(3),
  startTime: "10:00",
  endDate: isoDate(7),
  endTime: "10:00",
  firstName: "Marie",
  lastName: "Lefèvre",
  phone: "+33 6 12 34 56 78",
  email: "marie@example.fr",
  cin: "18AB45678",
  licenseNumber: "PC123456",
  country: "France",
  city: "Lyon",
  address: "12 rue de la République",
  comment: "Arrivée vol TO 3421",
  acceptTerms: true,
  website: "",
});

describe("demande de réservation depuis le site public", () => {
  it("crée un dossier PENDING, un client et une référence AC-ANNÉE-NNNNN", async () => {
    const { createReservation } = await import("@/server/actions/booking");
    const result = await createReservation(baseInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.reference).toMatch(/^AC-\d{4}-\d{5}$/);
    expect(result.token).toHaveLength(24);

    const reservation = await db.reservation.findUnique({
      where: { reference: result.reference },
      include: { customer: true },
    });

    expect(reservation).not.toBeNull();
    // Rien n'est confirmé automatiquement : l'agence garde la main.
    expect(reservation!.status).toBe("PENDING");
    expect(reservation!.paymentStatus).toBe("UNPAID");
    expect(reservation!.days).toBe(4);
    expect(reservation!.totalAmount).toBe(100000); // 4 x 250 DH
    expect(reservation!.customer.firstName).toBe("Marie");
    expect(reservation!.customer.email).toBe("marie@example.fr");
  });

  it("incrémente la numérotation sans jamais réutiliser un numéro", async () => {
    const { createReservation } = await import("@/server/actions/booking");

    const first = await createReservation(baseInput());
    const second = await createReservation({
      ...baseInput(),
      startDate: isoDate(20),
      endDate: isoDate(24),
      phone: "+33 6 99 99 99 99",
      email: "autre@example.fr",
    });

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.reference).not.toBe(second.reference);
    expect(Number(second.reference.split("-")[2])).toBe(
      Number(first.reference.split("-")[2]) + 1,
    );
  });

  it("refuse une seconde demande qui chevauche la première", async () => {
    const { createReservation } = await import("@/server/actions/booking");

    const first = await createReservation(baseInput());
    expect(first.ok).toBe(true);

    const second = await createReservation({
      ...baseInput(),
      startDate: isoDate(5),
      endDate: isoDate(9),
      phone: "+212 661 000 000",
      email: "second@example.ma",
    });

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error).toContain("vient d'être réservé");
    }

    // Une seule réservation existe bien en base.
    expect(await db.reservation.count()).toBe(1);
  });

  it("refuse une date de retour antérieure au départ", async () => {
    const { createReservation } = await import("@/server/actions/booking");
    const result = await createReservation({
      ...baseInput(),
      startDate: isoDate(9),
      endDate: isoDate(5),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("postérieure");
    expect(await db.reservation.count()).toBe(0);
  });

  it("refuse une demande sans acceptation des conditions", async () => {
    const { createReservation } = await import("@/server/actions/booking");
    const result = await createReservation({ ...baseInput(), acceptTerms: false });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.acceptTerms).toBeDefined();
    }
  });

  it("refuse un numéro de téléphone invalide", async () => {
    const { createReservation } = await import("@/server/actions/booking");
    const result = await createReservation({ ...baseInput(), phone: "abc" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.phone).toBeDefined();
  });

  it("ignore silencieusement une soumission de robot (champ piège rempli)", async () => {
    const { createReservation } = await import("@/server/actions/booking");
    const result = await createReservation({
      ...baseInput(),
      website: "https://spam.example",
    });

    expect(result.ok).toBe(false);
    expect(await db.reservation.count()).toBe(0);
  });

  it("réutilise la fiche d'un client déjà connu au lieu de créer un doublon", async () => {
    const { createReservation } = await import("@/server/actions/booking");

    await createReservation(baseInput());
    await createReservation({
      ...baseInput(),
      startDate: isoDate(20),
      endDate: isoDate(24),
      city: "Marseille",
    });

    expect(await db.customer.count()).toBe(1);
    const customer = await db.customer.findFirst();
    expect(customer!.city).toBe("Marseille"); // fiche enrichie
  });

  it("ne propose pas un véhicule immobilisé au garage", async () => {
    const { createReservation } = await import("@/server/actions/booking");

    await db.maintenance.create({
      data: {
        vehicleId,
        type: "REVISION",
        status: "PLANNED",
        startAt: day(2),
        endAt: day(8),
        blocksAvailability: true,
      },
    });

    const result = await createReservation(baseInput());
    expect(result.ok).toBe(false);
    expect(await db.reservation.count()).toBe(0);
  });

  it("accepte une adresse saisie librement, sans supplément automatique", async () => {
    const { createReservation } = await import("@/server/actions/booking");
    const { CUSTOM_LOCATION } = await import("@/lib/search-params");

    const result = await createReservation({
      ...baseInput(),
      // Aucun lieu enregistré ne correspond : le client saisit son hôtel.
      pickupLocationId: CUSTOM_LOCATION,
      pickupLocationText: "  Hôtel Riu, Taghazout  ",
      dropoffLocationId: CUSTOM_LOCATION,
      dropoffLocationText: "Aéroport, terminal 1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const reservation = await db.reservation.findUnique({
      where: { reference: result.reference },
    });

    // Le libellé est conservé, débarrassé des espaces superflus…
    expect(reservation!.pickupLocationLabel).toBe("Hôtel Riu, Taghazout");
    expect(reservation!.dropoffLocationLabel).toBe("Aéroport, terminal 1");
    // …et aucun identifiant fictif n'atterrit en base.
    expect(reservation!.pickupLocationId).toBeNull();
    expect(reservation!.dropoffLocationId).toBeNull();
    // Une adresse libre ne facture rien automatiquement.
    expect(reservation!.extraFees).toBe(0);
    expect(reservation!.totalAmount).toBe(100000);
  });

  it("refuse une adresse libre démesurée", async () => {
    const { createReservation } = await import("@/server/actions/booking");
    const { CUSTOM_LOCATION } = await import("@/lib/search-params");

    const result = await createReservation({
      ...baseInput(),
      pickupLocationId: CUSTOM_LOCATION,
      pickupLocationText: "a".repeat(400),
    });

    expect(result.ok).toBe(false);
    expect(await db.reservation.count()).toBe(0);
  });

  it("enregistre la CIN et le permis, rattachés au client et au dossier", async () => {
    const { createReservation } = await import("@/server/actions/booking");

    const cin = new File([new Uint8Array(2048)], "cin.jpg", { type: "image/jpeg" });
    const license = new File([new Uint8Array(1024)], "permis.pdf", {
      type: "application/pdf",
    });

    const result = await createReservation(baseInput(), { cin, license });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const reservation = await db.reservation.findUnique({
      where: { reference: result.reference },
      include: { documents: true, customer: true },
    });

    expect(reservation!.documents).toHaveLength(2);

    const types = reservation!.documents.map((d) => d.type).sort();
    expect(types).toEqual(["CIN", "DRIVER_LICENSE"]);

    for (const document of reservation!.documents) {
      // Rattachées au client : réutilisables pour ses locations suivantes.
      expect(document.customerId).toBe(reservation!.customerId);
      // Stockées hors du dossier public, sous une clé opaque.
      expect(document.storageKey).toMatch(/^documents\/[a-f0-9-]+\.(jpg|pdf)$/);
      // Déposées par le client : aucun agent ne les a téléversées.
      expect(document.uploadedById).toBeNull();
    }
  });

  it("refuse la demande si les pièces sont exigées et absentes", async () => {
    settingsState.requireDocuments = true;
    const { createReservation } = await import("@/server/actions/booking");

    const result = await createReservation(baseInput());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.cinFile).toBeDefined();
      expect(result.fieldErrors?.licenseFile).toBeDefined();
    }
    expect(await db.reservation.count()).toBe(0);
  });

  it("refuse un fichier au format non autorisé, sans rien écrire", async () => {
    const { createReservation } = await import("@/server/actions/booking");

    const result = await createReservation(baseInput(), {
      cin: new File([new Uint8Array(64)], "virus.exe", {
        type: "application/x-msdownload",
      }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.cinFile).toMatch(/Format/);
    expect(await db.reservation.count()).toBe(0);
    expect(await db.document.count()).toBe(0);
  });

  it("accepte une demande sans pièces quand l'agence ne les exige pas", async () => {
    const { createReservation } = await import("@/server/actions/booking");

    const result = await createReservation(baseInput());
    expect(result.ok).toBe(true);
    expect(await db.document.count()).toBe(0);
  });

  it("calcule le devis côté serveur, sans faire confiance au navigateur", async () => {
    const { getQuote } = await import("@/server/actions/booking");

    const quote = await getQuote({
      vehicleId,
      startDate: isoDate(3),
      startTime: "10:00",
      endDate: isoDate(7),
      endTime: "10:00",
    });

    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    expect(quote.available).toBe(true);
    expect(quote.quote!.days).toBe(4);
    expect(quote.quote!.total).toBe(100000);
  });

  it("bloque un envoi massif depuis la même adresse IP", async () => {
    const { createReservation } = await import("@/server/actions/booking");

    // Les 5 premières demandes passent la limite ; la 6e est refusée.
    for (let index = 0; index < 5; index += 1) {
      await createReservation({
        ...baseInput(),
        startDate: isoDate(30 + index * 5),
        endDate: isoDate(32 + index * 5),
      });
    }

    const blocked = await createReservation({
      ...baseInput(),
      startDate: isoDate(90),
      endDate: isoDate(92),
    });

    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toContain("Trop de demandes");
  });

  it("signale l'indisponibilité et nomme la période bloquée", async () => {
    const { createReservation, getQuote } = await import("@/server/actions/booking");
    await createReservation(baseInput());

    const quote = await getQuote({
      vehicleId,
      startDate: isoDate(4),
      startTime: "10:00",
      endDate: isoDate(6),
      endTime: "10:00",
    });

    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    expect(quote.available).toBe(false);
    expect(quote.conflicts.length).toBeGreaterThan(0);
  });
});
