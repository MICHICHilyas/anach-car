import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTestCustomer,
  createTestDb,
  createTestVehicle,
  day,
  resetDatabase,
} from "../setup/db";
import type { Prisma } from "../../src/generated/prisma/client";

/**
 * Numérotation des réservations et des véhicules.
 *
 * Le bug d'origine : le compteur pouvait retomber sur une référence déjà
 * utilisée (jeu de démonstration, import de l'existant, restauration de
 * sauvegarde) et l'enregistrement échouait sur la contrainte d'unicité —
 * aussi bien à l'ajout d'un véhicule qu'à la réception d'une réservation
 * envoyée depuis le site public.
 */
const db = createTestDb();

vi.mock("@/lib/db", async () => {
  const { createTestDb } = await import("../setup/db");
  return { db: createTestDb() };
});

/** Le client complet expose les mêmes méthodes qu'un client de transaction. */
const tx = db as unknown as Prisma.TransactionClient;

beforeAll(async () => {
  await resetDatabase(db);
});

beforeEach(async () => {
  await db.reservation.deleteMany();
  await db.vehicle.deleteMany();
  await db.customer.deleteMany();
  await db.counter.deleteMany();
});

afterAll(async () => {
  await resetDatabase(db);
  await db.$disconnect();
});

describe("références internes de véhicule", () => {
  it("numérote à partir de un sur une base vierge", async () => {
    const { nextVehicleCode } = await import("@/lib/reference");
    expect(await nextVehicleCode(tx)).toBe("AC-V-001");
    expect(await nextVehicleCode(tx)).toBe("AC-V-002");
  });

  it("saute les références déjà prises quand le compteur est en retard", async () => {
    const { nextVehicleCode } = await import("@/lib/reference");

    // Situation réelle : des véhicules existent, le compteur est resté à zéro.
    for (let index = 1; index <= 10; index += 1) {
      await createTestVehicle(db, {
        internalCode: `AC-V-${String(index).padStart(3, "0")}`,
      });
    }
    expect(await db.counter.findUnique({ where: { key: "vehicle" } })).toBeNull();

    expect(await nextVehicleCode(tx)).toBe("AC-V-011");
    // Le compteur est réaligné : l'appel suivant est immédiat.
    expect(await nextVehicleCode(tx)).toBe("AC-V-012");
  });
});

describe("références de réservation", () => {
  async function createReservation(reference: string) {
    const vehicle = await createTestVehicle(db);
    const customer = await createTestCustomer(db);
    return db.reservation.create({
      data: {
        reference,
        vehicleId: vehicle.id,
        customerId: customer.id,
        startAt: day(Math.random() * 300 + 400),
        endAt: day(Math.random() * 300 + 800),
        days: 1,
        dailyRate: 25000,
        subtotal: 25000,
        totalAmount: 25000,
        status: "COMPLETED",
      },
    });
  }

  it("numérote AC-ANNÉE-00001 sur une base vierge", async () => {
    const { nextReservationReference } = await import("@/lib/reference");
    const date = new Date("2026-05-10T00:00:00.000Z");
    expect(await nextReservationReference(tx, date)).toBe("AC-2026-00001");
  });

  it("saute les références déjà prises quand le compteur est en retard", async () => {
    const { nextReservationReference } = await import("@/lib/reference");
    const date = new Date("2026-05-10T00:00:00.000Z");

    for (let index = 1; index <= 15; index += 1) {
      await createReservation(`AC-2026-${String(index).padStart(5, "0")}`);
    }
    await db.counter.create({ data: { key: "reservation:2026", value: 0 } });

    expect(await nextReservationReference(tx, date)).toBe("AC-2026-00016");
    expect(await nextReservationReference(tx, date)).toBe("AC-2026-00017");
  });

  it("repart de un pour une nouvelle année", async () => {
    const { nextReservationReference } = await import("@/lib/reference");

    await nextReservationReference(tx, new Date("2026-12-31T00:00:00.000Z"));
    expect(
      await nextReservationReference(tx, new Date("2027-01-01T00:00:00.000Z")),
    ).toBe("AC-2027-00001");
  });
});
