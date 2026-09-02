import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { ReservationStatus } from "@/generated/prisma/enums";

export const PAGE_SIZE = 25;

export type ReservationFilters = {
  status?: string;
  q?: string;
  page?: number;
  vehicleId?: string;
  customerId?: string;
};

function buildWhere(filters: ReservationFilters): Prisma.ReservationWhereInput {
  const where: Prisma.ReservationWhereInput = {};

  if (filters.status && filters.status in ReservationStatus) {
    where.status = filters.status as ReservationStatus;
  }
  if (filters.vehicleId) where.vehicleId = filters.vehicleId;
  if (filters.customerId) where.customerId = filters.customerId;

  if (filters.q) {
    const q = filters.q.trim();
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { customer: { firstName: { contains: q, mode: "insensitive" } } },
      { customer: { lastName: { contains: q, mode: "insensitive" } } },
      { customer: { phone: { contains: q } } },
      { vehicle: { brand: { contains: q, mode: "insensitive" } } },
      { vehicle: { model: { contains: q, mode: "insensitive" } } },
      { vehicle: { plate: { contains: q, mode: "insensitive" } } },
    ];
  }
  return where;
}

export async function listReservations(filters: ReservationFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const where = buildWhere(filters);

  const [items, total, counts] = await Promise.all([
    db.reservation.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        reference: true,
        startAt: true,
        endAt: true,
        days: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
        source: true,
        createdAt: true,
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        vehicle: { select: { id: true, brand: true, model: true, plate: true } },
      },
    }),
    db.reservation.count({ where }),
    db.reservation.groupBy({ by: ["status"], _count: true }),
  ]);

  const countFor = (status: string) =>
    counts.find((row) => row.status === status)?._count ?? 0;

  return {
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    counts: {
      all: counts.reduce((sum, row) => sum + row._count, 0),
      PENDING: countFor("PENDING"),
      CONFIRMED: countFor("CONFIRMED"),
      ACTIVE: countFor("ACTIVE"),
      COMPLETED: countFor("COMPLETED"),
      CANCELLED: countFor("CANCELLED"),
      REJECTED: countFor("REJECTED"),
    },
  };
}

export async function getReservationDetail(id: string) {
  return db.reservation.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: {
        select: {
          id: true,
          brand: true,
          model: true,
          year: true,
          plate: true,
          slug: true,
          mileage: true,
          // Nécessaires au contrat de location imprimable.
          category: true,
          transmission: true,
          fuel: true,
          images: {
            select: { url: true, alt: true },
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
            take: 1,
          },
        },
      },
      rental: {
        include: {
          checkedOutBy: { select: { name: true } },
          checkedInBy: { select: { name: true } },
        },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        include: { recordedBy: { select: { name: true } } },
      },
      documents: {
        select: {
          id: true,
          type: true,
          title: true,
          fileName: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      },
      confirmedBy: { select: { name: true } },
      pickupLocation: { select: { name: true } },
      dropoffLocation: { select: { name: true } },
    },
  });
}

/** Journal d'activité lié à une entité (affiché sur la fiche réservation). */
export async function getEntityHistory(entityType: string, entityId: string) {
  return db.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      action: true,
      summary: true,
      userLabel: true,
      createdAt: true,
    },
  });
}
