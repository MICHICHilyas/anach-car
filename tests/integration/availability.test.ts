import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTestCustomer,
  createTestDb,
  createTestVehicle,
  day,
  resetDatabase,
} from "../setup/db";

/**
 * Tests d'intégration de la règle la plus critique du système :
 * un véhicule ne peut jamais être vendu deux fois sur la même période.
 *
 * Ils tournent sur une vraie base PostgreSQL afin de vérifier aussi la
 * contrainte d'exclusion posée par la migration.
 */
const db = createTestDb();

// Les modules applicatifs importent `@/lib/db` : on le fait pointer vers la
// base de test le temps de la suite.
vi.mock("@/lib/db", async () => {
  const { createTestDb } = await import("../setup/db");
  return { db: createTestDb() };
});

let vehicleId: string;
let customerId: string;

beforeAll(async () => {
  await resetDatabase(db);
});

beforeEach(async () => {
  await db.reservation.deleteMany();
  await db.maintenance.deleteMany();
  const vehicle = await createTestVehicle(db);
  const customer = await createTestCustomer(db);
  vehicleId = vehicle.id;
  customerId = customer.id;
});

afterAll(async () => {
  await resetDatabase(db);
  await db.$disconnect();
});

async function createReservation(
  start: Date,
  end: Date,
  status: "PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED" = "CONFIRMED",
) {
  const unique = Math.random().toString(36).slice(2, 9);
  return db.reservation.create({
    data: {
      reference: `AC-TEST-${unique}`,
      vehicleId,
      customerId,
      startAt: start,
      endAt: end,
      days: 4,
      dailyRate: 25000,
      subtotal: 100000,
      totalAmount: 100000,
      status,
    },
  });
}

describe("contrainte base de données contre la double réservation", () => {
  it("refuse une seconde réservation qui chevauche une réservation confirmée", async () => {
    await createReservation(day(5), day(9), "CONFIRMED");

    await expect(createReservation(day(7), day(11), "CONFIRMED")).rejects.toThrow();
  });

  it("refuse aussi le chevauchement avec une simple demande en attente", async () => {
    await createReservation(day(5), day(9), "PENDING");

    await expect(createReservation(day(6), day(8), "CONFIRMED")).rejects.toThrow();
  });

  it("autorise deux locations qui se suivent sans se chevaucher", async () => {
    await createReservation(day(5), day(9), "CONFIRMED");
    const second = await createReservation(day(9), day(12), "CONFIRMED");

    expect(second.id).toBeTruthy();
  });

  it("libère la période dès qu'une réservation est annulée ou refusée", async () => {
    const first = await createReservation(day(5), day(9), "CONFIRMED");
    await db.reservation.update({
      where: { id: first.id },
      data: { status: "CANCELLED" },
    });

    const second = await createReservation(day(6), day(8), "CONFIRMED");
    expect(second.id).toBeTruthy();
  });

  it("refuse une période dont la fin précède le début", async () => {
    await expect(createReservation(day(9), day(5), "CONFIRMED")).rejects.toThrow();
  });
});

describe("moteur de disponibilité applicatif", () => {
  it("déclare le véhicule indisponible pendant une réservation confirmée", async () => {
    const { isVehicleAvailable } = await import("@/lib/availability");
    await createReservation(day(5), day(9), "CONFIRMED");

    expect(await isVehicleAvailable(vehicleId, day(6), day(8))).toBe(false);
    expect(await isVehicleAvailable(vehicleId, day(20), day(24))).toBe(true);
  });

  it("nomme la réservation qui bloque, pour que l'agence sache pourquoi", async () => {
    const { findConflicts } = await import("@/lib/availability");
    const reservation = await createReservation(day(5), day(9), "CONFIRMED");

    const conflicts = await findConflicts(vehicleId, day(6), day(8));
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].kind).toBe("reservation");
    expect(conflicts[0].reference).toBe(reservation.reference);
  });

  it("exclut un véhicule immobilisé au garage sur la période", async () => {
    const { isVehicleAvailable } = await import("@/lib/availability");

    await db.maintenance.create({
      data: {
        vehicleId,
        type: "REVISION",
        status: "PLANNED",
        startAt: day(3),
        endAt: day(6),
        blocksAvailability: true,
      },
    });

    expect(await isVehicleAvailable(vehicleId, day(4), day(5))).toBe(false);
    expect(await isVehicleAvailable(vehicleId, day(10), day(12))).toBe(true);
  });

  it("ignore une immobilisation qui ne bloque pas la disponibilité", async () => {
    const { isVehicleAvailable } = await import("@/lib/availability");

    await db.maintenance.create({
      data: {
        vehicleId,
        type: "CLEANING",
        status: "PLANNED",
        startAt: day(3),
        endAt: day(6),
        blocksAvailability: false,
      },
    });

    expect(await isVehicleAvailable(vehicleId, day(4), day(5))).toBe(true);
  });

  it("retire de la recherche publique un véhicule en maintenance ou indisponible", async () => {
    const { buildVehicleWhere } = await import("@/lib/availability");
    const where = buildVehicleWhere({ start: day(4), end: day(6) });

    const maintenance = await createTestVehicle(db, { status: "MAINTENANCE" });
    const unavailable = await createTestVehicle(db, { status: "UNAVAILABLE" });

    const found = await db.vehicle.findMany({ where, select: { id: true } });
    const ids = found.map((vehicle) => vehicle.id);

    expect(ids).toContain(vehicleId);
    expect(ids).not.toContain(maintenance.id);
    expect(ids).not.toContain(unavailable.id);
  });

  it("propose un véhicule actuellement loué pour une période future libre", async () => {
    const { buildVehicleWhere } = await import("@/lib/availability");

    // Location en cours : le véhicule est physiquement sorti…
    await createReservation(day(-2), day(2), "ACTIVE");
    await db.vehicle.update({
      where: { id: vehicleId },
      data: { status: "RENTED" },
    });

    // … mais il reste réservable pour le mois suivant.
    const where = buildVehicleWhere({ start: day(30), end: day(34) });
    const found = await db.vehicle.findMany({ where, select: { id: true } });

    expect(found.map((vehicle) => vehicle.id)).toContain(vehicleId);
  });
});

describe("règles de période", () => {
  it("refuse une date de retour antérieure au départ", async () => {
    const { validatePeriod } = await import("@/lib/availability");
    const { DEFAULT_SETTINGS } = await import("@/lib/settings");

    const result = validatePeriod(day(9), day(5), DEFAULT_SETTINGS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("postérieure");
  });

  it("refuse une réservation trop tardive par rapport au délai minimum", async () => {
    const { validatePeriod } = await import("@/lib/availability");
    const { DEFAULT_SETTINGS } = await import("@/lib/settings");

    const inOneHour = new Date(Date.now() + 3600 * 1000);
    const result = validatePeriod(
      inOneHour,
      new Date(inOneHour.getTime() + 3 * 86400000),
      { ...DEFAULT_SETTINGS, reservation: { ...DEFAULT_SETTINGS.reservation, minAdvanceHours: 2 } },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("2 h à l'avance");
  });

  it("refuse une durée supérieure au maximum autorisé", async () => {
    const { validatePeriod } = await import("@/lib/availability");
    const { DEFAULT_SETTINGS } = await import("@/lib/settings");

    const result = validatePeriod(day(5), day(200), DEFAULT_SETTINGS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("durée maximale");
  });

  it("accepte une période valide", async () => {
    const { validatePeriod } = await import("@/lib/availability");
    const { DEFAULT_SETTINGS } = await import("@/lib/settings");

    const result = validatePeriod(day(5), day(9), DEFAULT_SETTINGS);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.days).toBe(4);
  });
});
