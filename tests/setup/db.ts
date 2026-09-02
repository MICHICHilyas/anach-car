import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

/** Client Prisma branché sur la base de test. */
export function createTestDb() {
  const connectionString =
    process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL!.replace(/\/[^/?]+(\?|$)/, "/anach_car_test$1");

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Vide toutes les tables entre deux fichiers de test. */
export async function resetDatabase(db: ReturnType<typeof createTestDb>) {
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.document.deleteMany();
  await db.payment.deleteMany();
  await db.rental.deleteMany();
  await db.reservation.deleteMany();
  await db.maintenanceRecord.deleteMany();
  await db.maintenance.deleteMany();
  await db.pricingRule.deleteMany();
  await db.vehicleImage.deleteMany();
  await db.vehicle.deleteMany();
  await db.customer.deleteMany();
  await db.location.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
  await db.counter.deleteMany();
}

/** Véhicule de test : Renault Clio à 250 DH / jour. */
export async function createTestVehicle(
  db: ReturnType<typeof createTestDb>,
  overrides: Partial<{
    plate: string;
    slug: string;
    internalCode: string;
    dailyRate: number;
    rate3Days: number | null;
    weeklyRate: number | null;
    monthlyRate: number | null;
    status: "AVAILABLE" | "RENTED" | "MAINTENANCE" | "UNAVAILABLE";
  }> = {},
) {
  const unique = Math.random().toString(36).slice(2, 8);
  return db.vehicle.create({
    data: {
      internalCode: overrides.internalCode ?? `AC-V-${unique}`,
      slug: overrides.slug ?? `clio-${unique}`,
      brand: "Renault",
      model: "Clio",
      year: 2023,
      plate: overrides.plate ?? `${unique}-A-6`,
      category: "COMPACTE",
      transmission: "MANUAL",
      fuel: "DIESEL",
      seats: 5,
      doors: 5,
      mileage: 50000,
      dailyRate: overrides.dailyRate ?? 25000,
      rate3Days: overrides.rate3Days === undefined ? null : overrides.rate3Days,
      weeklyRate: overrides.weeklyRate === undefined ? null : overrides.weeklyRate,
      monthlyRate: overrides.monthlyRate === undefined ? null : overrides.monthlyRate,
      status: overrides.status ?? "AVAILABLE",
    },
  });
}

export async function createTestCustomer(db: ReturnType<typeof createTestDb>) {
  const unique = Math.random().toString(36).slice(2, 8);
  return db.customer.create({
    data: {
      firstName: "Ahmed",
      lastName: "Test",
      phone: `+2126${unique}`,
    },
  });
}

/** Date relative à aujourd'hui, à 10 h. */
export function day(offset: number, hour = 10): Date {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Date(date.getTime() + offset * 24 * 3600 * 1000);
}
