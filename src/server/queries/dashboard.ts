import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getSettings } from "@/lib/settings";
import { addDays } from "@/lib/dates";

/**
 * Agrégats du tableau de bord.
 *
 * Tout est calculé en SQL (count / aggregate / groupBy) plutôt qu'en
 * chargeant les lignes en mémoire : le dashboard reste rapide même avec
 * plusieurs milliers de réservations.
 */

const REVENUE_TYPES = ["DEPOSIT", "BALANCE", "EXTRA_FEE"] as const;

export async function getFleetStats() {
  const [total, byStatus] = await Promise.all([
    db.vehicle.count({ where: { archivedAt: null } }),
    db.vehicle.groupBy({
      by: ["status"],
      where: { archivedAt: null },
      _count: true,
    }),
  ]);

  const count = (status: string) =>
    byStatus.find((row) => row.status === status)?._count ?? 0;

  return {
    total,
    available: count("AVAILABLE"),
    rented: count("RENTED"),
    maintenance: count("MAINTENANCE"),
    unavailable: count("UNAVAILABLE"),
    archived: await db.vehicle.count({ where: { archivedAt: { not: null } } }),
  };
}

export async function getReservationStats() {
  const byStatus = await db.reservation.groupBy({
    by: ["status"],
    _count: true,
  });
  const count = (status: string) =>
    byStatus.find((row) => row.status === status)?._count ?? 0;

  return {
    pending: count("PENDING"),
    confirmed: count("CONFIRMED"),
    active: count("ACTIVE"),
    completed: count("COMPLETED"),
    cancelled: count("CANCELLED") + count("REJECTED"),
  };
}

export async function getMaintenanceStats() {
  const settings = await getSettings();
  const now = new Date();

  const vehicles = await db.vehicle.findMany({
    where: { archivedAt: null },
    select: {
      mileage: true,
      nextOilChangeMileage: true,
      insuranceExpiry: true,
      technicalInspectionExpiry: true,
    },
  });

  let oilDue = 0;
  let oilOverdue = 0;
  let insuranceExpiring = 0;
  let inspectionExpiring = 0;

  for (const vehicle of vehicles) {
    if (vehicle.nextOilChangeMileage != null) {
      const remaining = vehicle.nextOilChangeMileage - vehicle.mileage;
      if (remaining <= 0) oilOverdue += 1;
      else if (remaining <= settings.maintenance.oilChangeAlertKm) oilDue += 1;
    }
    if (
      vehicle.insuranceExpiry &&
      vehicle.insuranceExpiry <= addDays(now, settings.maintenance.insuranceAlertDays)
    ) {
      insuranceExpiring += 1;
    }
    if (
      vehicle.technicalInspectionExpiry &&
      vehicle.technicalInspectionExpiry <=
        addDays(now, settings.maintenance.inspectionAlertDays)
    ) {
      inspectionExpiring += 1;
    }
  }

  const plannedMaintenance = await db.maintenance.count({
    where: { status: { in: ["PLANNED", "IN_PROGRESS"] } },
  });

  return {
    oilDue,
    oilOverdue,
    insuranceExpiring,
    inspectionExpiring,
    plannedMaintenance,
  };
}

export async function getFinanceStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = addDays(now, -7);

  const [month, week, reservationsThisMonth, outstanding] = await Promise.all([
    db.payment.aggregate({
      where: { paidAt: { gte: startOfMonth }, type: { in: [...REVENUE_TYPES] } },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { paidAt: { gte: startOfWeek }, type: { in: [...REVENUE_TYPES] } },
      _sum: { amount: true },
    }),
    db.reservation.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.reservation.aggregate({
      where: { status: { in: ["CONFIRMED", "ACTIVE"] }, paymentStatus: { not: "PAID" } },
      _sum: { totalAmount: true },
    }),
  ]);

  return {
    monthRevenue: month._sum.amount ?? 0,
    weekRevenue: week._sum.amount ?? 0,
    reservationsThisMonth,
    outstanding: outstanding._sum.totalAmount ?? 0,
  };
}

/** Chiffre d'affaires encaissé mois par mois, sur les 6 derniers mois. */
export async function getRevenueSeries(months = 6) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [payments, reservations] = await Promise.all([
    db.payment.findMany({
      where: { paidAt: { gte: from }, type: { in: [...REVENUE_TYPES] } },
      select: { amount: true, paidAt: true },
    }),
    db.reservation.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true },
    }),
  ]);

  const buckets = new Map<string, { revenue: number; reservations: number }>();
  for (let index = 0; index < months; index += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
    buckets.set(monthKey(date), { revenue: 0, reservations: 0 });
  }

  for (const payment of payments) {
    const bucket = buckets.get(monthKey(payment.paidAt));
    if (bucket) bucket.revenue += payment.amount;
  }
  for (const reservation of reservations) {
    const bucket = buckets.get(monthKey(reservation.createdAt));
    if (bucket) bucket.reservations += 1;
  }

  return Array.from(buckets.entries()).map(([key, value]) => ({
    month: formatMonthLabel(key),
    revenue: value.revenue / 100,
    reservations: value.reservations,
  }));
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-MA", { month: "short" }).format(
    new Date(year, month - 1, 1),
  );
}

/** Ce qui se passe aujourd'hui : départs, retours, demandes à traiter. */
export async function getTodayAgenda() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 3600 * 1000);

  const [departures, returns, pendingRequests] = await Promise.all([
    db.reservation.findMany({
      where: {
        status: "CONFIRMED",
        startAt: { gte: startOfDay, lt: endOfDay },
      },
      select: reservationRowSelect,
      orderBy: { startAt: "asc" },
    }),
    db.reservation.findMany({
      where: { status: "ACTIVE", endAt: { lt: endOfDay } },
      select: reservationRowSelect,
      orderBy: { endAt: "asc" },
    }),
    db.reservation.findMany({
      where: { status: "PENDING" },
      select: reservationRowSelect,
      orderBy: { createdAt: "asc" },
      take: 6,
    }),
  ]);

  return { departures, returns, pendingRequests };
}

export const reservationRowSelect = {
  id: true,
  reference: true,
  startAt: true,
  endAt: true,
  days: true,
  totalAmount: true,
  status: true,
  paymentStatus: true,
  createdAt: true,
  customer: {
    select: { id: true, firstName: true, lastName: true, phone: true },
  },
  vehicle: { select: { id: true, brand: true, model: true, plate: true } },
} satisfies Prisma.ReservationSelect;

/** Alertes non lues, les plus graves d'abord. */
export async function getDashboardAlerts(limit = 8) {
  return db.notification.findMany({
    where: { isRead: false },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      type: true,
      severity: true,
      title: true,
      message: true,
      link: true,
      createdAt: true,
    },
  });
}
