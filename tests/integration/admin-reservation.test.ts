import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { rm } from "node:fs/promises";
import path from "node:path";
import {
  createTestCustomer,
  createTestDb,
  createTestVehicle,
  day,
  resetDatabase,
} from "../setup/db";

/**
 * Réservation saisie au comptoir (téléphone, WhatsApp, client sur place).
 *
 * Ce chemin diffère du formulaire public : le délai minimum de réservation
 * ne s'applique pas, le dossier peut être confirmé immédiatement, et les
 * pièces d'identité sont facultatives — l'employé a les originaux en main.
 * En revanche le contrôle de chevauchement reste identique : c'est la règle
 * qui protège l'agence.
 */
const db = createTestDb();

vi.mock("@/lib/db", async () => {
  const { createTestDb } = await import("../setup/db");
  return { db: createTestDb() };
});

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1" }),
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

// L'employé connecté : on court-circuite la vérification de session, qui
// dépend des cookies du navigateur.
vi.mock("@/lib/auth", async () => {
  const agent = {
    id: "user-test",
    email: "agence@anachcar.ma",
    name: "Employé test",
    role: "ADMIN" as const,
  };
  return {
    requireUserOrThrow: async () => agent,
    requireUser: async () => agent,
    getCurrentUser: async () => agent,
  };
});

vi.mock("@/lib/settings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/settings")>(
    "@/lib/settings",
  );
  return { ...actual, getSettings: async () => actual.DEFAULT_SETTINGS };
});

let vehicleId: string;

beforeAll(async () => {
  process.env.STORAGE_DRIVER = "local";
  process.env.STORAGE_LOCAL_DIR = ".data/test-admin-uploads";
  await resetDatabase(db);
});

beforeEach(async () => {
  await db.document.deleteMany();
  await db.reservation.deleteMany();
  await db.customer.deleteMany();
  await db.vehicle.deleteMany();
  await db.counter.deleteMany();
  // L'employé survit d'un test à l'autre : les réservations le référencent.
  await db.user.upsert({
    where: { id: "user-test" },
    create: {
      id: "user-test",
      email: "agent-test@anachcar.ma",
      name: "Employé test",
      passwordHash: "x",
      role: "ADMIN",
    },
    update: {},
  });
  vehicleId = (await createTestVehicle(db, { dailyRate: 25000 })).id;
});

afterAll(async () => {
  await resetDatabase(db);
  await rm(path.resolve(process.cwd(), ".data/test-admin-uploads"), {
    recursive: true,
    force: true,
  });
  await db.$disconnect();
});

function isoDate(offset: number): string {
  return new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
}

const walkIn = () => ({
  vehicleId,
  firstName: "Youssef",
  lastName: "Ait Baha",
  phone: "+212 663 456 789",
  startDate: isoDate(0),
  startTime: "10:00",
  endDate: isoDate(4),
  endTime: "10:00",
  source: "WALK_IN" as const,
  confirmImmediately: true,
});

describe("réservation saisie au comptoir", () => {
  it("crée le client et confirme immédiatement le dossier", async () => {
    const { createAdminReservation } = await import("@/server/actions/reservations");

    const result = await createAdminReservation(walkIn());
    expect(result.ok).toBe(true);
    if (!result.ok || !result.data) return;

    const reservation = await db.reservation.findUnique({
      where: { id: result.data.id },
      include: { customer: true },
    });

    expect(reservation!.status).toBe("CONFIRMED");
    expect(reservation!.confirmedById).toBe("user-test");
    expect(reservation!.source).toBe("WALK_IN");
    expect(reservation!.customer.firstName).toBe("Youssef");
    expect(reservation!.days).toBe(4);
    expect(reservation!.totalAmount).toBe(100000);
  });

  it("permet un départ immédiat, sans délai minimum de réservation", async () => {
    const { createAdminReservation } = await import("@/server/actions/reservations");

    // Le formulaire public exige 2 h d'avance ; un client au comptoir part
    // tout de suite.
    const now = new Date();
    const result = await createAdminReservation({
      ...walkIn(),
      startDate: now.toISOString().slice(0, 10),
      startTime: `${String(now.getHours()).padStart(2, "0")}:00`,
    });

    expect(result.ok).toBe(true);
  });

  it("peut laisser le dossier en attente de validation", async () => {
    const { createAdminReservation } = await import("@/server/actions/reservations");

    const result = await createAdminReservation({
      ...walkIn(),
      confirmImmediately: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok || !result.data) return;

    const reservation = await db.reservation.findUnique({
      where: { id: result.data.id },
    });
    expect(reservation!.status).toBe("PENDING");
    expect(reservation!.confirmedById).toBeNull();
  });

  it("enregistre les pièces photographiées au comptoir", async () => {
    const { createAdminReservation } = await import("@/server/actions/reservations");

    const result = await createAdminReservation(walkIn(), {
      cin: new File([new Uint8Array(1024)], "cin.jpg", { type: "image/jpeg" }),
      license: new File([new Uint8Array(1024)], "permis.jpg", {
        type: "image/jpeg",
      }),
    });

    expect(result.ok).toBe(true);
    if (!result.ok || !result.data) return;

    const documents = await db.document.findMany({
      where: { reservationId: result.data.id },
    });

    expect(documents).toHaveLength(2);
    for (const document of documents) {
      // L'employé qui a déposé la pièce est tracé — contrairement au dépôt
      // fait par le client depuis le site.
      expect(document.uploadedById).toBe("user-test");
      expect(document.title).toContain("remis au comptoir");
      expect(document.storageKey).toMatch(/^documents\//);
    }
  });

  it("reste possible sans pièces : l'employé a les originaux en main", async () => {
    const { createAdminReservation } = await import("@/server/actions/reservations");

    const result = await createAdminReservation(walkIn());
    expect(result.ok).toBe(true);
    expect(await db.document.count()).toBe(0);
  });

  it("refuse un fichier au format non autorisé sans créer la réservation", async () => {
    const { createAdminReservation } = await import("@/server/actions/reservations");

    const result = await createAdminReservation(walkIn(), {
      cin: new File([new Uint8Array(64)], "script.exe", {
        type: "application/x-msdownload",
      }),
    });

    expect(result.ok).toBe(false);
    expect(await db.reservation.count()).toBe(0);
    expect(await db.document.count()).toBe(0);
  });

  it("refuse un chevauchement avec une réservation existante", async () => {
    const { createAdminReservation } = await import("@/server/actions/reservations");
    const customer = await createTestCustomer(db);

    await db.reservation.create({
      data: {
        reference: "AC-TEST-00001",
        vehicleId,
        customerId: customer.id,
        startAt: day(1),
        endAt: day(6),
        days: 5,
        dailyRate: 25000,
        subtotal: 125000,
        totalAmount: 125000,
        status: "CONFIRMED",
      },
    });

    const result = await createAdminReservation({
      ...walkIn(),
      startDate: isoDate(2),
      endDate: isoDate(5),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("déjà pris");
  });

  it("exige un client : ni fiche existante, ni nom complet", async () => {
    const { createAdminReservation } = await import("@/server/actions/reservations");

    const result = await createAdminReservation({
      vehicleId,
      startDate: isoDate(1),
      startTime: "10:00",
      endDate: isoDate(3),
      endTime: "10:00",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("client");
  });
});
