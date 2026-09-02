import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  ReservationStatus,
  VehicleStatus,
  MaintenanceStatus,
} from "@/generated/prisma/enums";
import { computeRentalDays } from "@/lib/dates";
import type { AppSettings } from "@/lib/settings";

/**
 * Disponibilité réelle d'un véhicule.
 *
 * Règle fondamentale : la disponibilité ne dépend PAS du champ
 * `vehicle.status`, mais du croisement véhicule × période × réservations
 * existantes × immobilisations garage. Une voiture « louée aujourd'hui »
 * reste réservable pour le mois prochain.
 */

/** Statuts qui immobilisent réellement le véhicule sur la période. */
export const BLOCKING_RESERVATION_STATUSES: ReservationStatus[] = [
  ReservationStatus.PENDING,
  ReservationStatus.CONFIRMED,
  ReservationStatus.ACTIVE,
];

export type Conflict = {
  kind: "reservation" | "maintenance";
  from: Date;
  to: Date;
  label: string;
  reference?: string;
};

export type PeriodValidation =
  | { ok: true; days: number }
  | { ok: false; error: string; days: number };

/**
 * Contrôles métier sur la période demandée, appliqués côté serveur avant
 * toute écriture (le front n'est jamais la source de vérité).
 */
export function validatePeriod(
  start: Date,
  end: Date,
  settings: AppSettings,
  now: Date = new Date(),
): PeriodValidation {
  const days = computeRentalDays(start, end, settings.reservation.graceMinutes);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, error: "Dates invalides.", days: 0 };
  }
  if (end <= start) {
    return {
      ok: false,
      error: "La date de retour doit être postérieure à la date de départ.",
      days: 0,
    };
  }
  const minAdvanceMs = settings.reservation.minAdvanceHours * 3600 * 1000;
  if (start.getTime() < now.getTime() + minAdvanceMs) {
    return {
      ok: false,
      error: `La réservation doit être faite au moins ${settings.reservation.minAdvanceHours} h à l'avance.`,
      days,
    };
  }
  if (days < settings.reservation.minRentalDays) {
    return {
      ok: false,
      error: `La durée minimale de location est de ${settings.reservation.minRentalDays} jour(s).`,
      days,
    };
  }
  if (days > settings.reservation.maxRentalDays) {
    return {
      ok: false,
      error: `La durée maximale de location est de ${settings.reservation.maxRentalDays} jours. Contactez-nous pour une longue durée.`,
      days,
    };
  }
  return { ok: true, days };
}

/** Réservations et immobilisations qui entrent en conflit avec la période. */
export async function findConflicts(
  vehicleId: string,
  start: Date,
  end: Date,
  options: { excludeReservationId?: string } = {},
): Promise<Conflict[]> {
  const overlap = { startAt: { lt: end }, endAt: { gt: start } };

  const [reservations, maintenances] = await Promise.all([
    db.reservation.findMany({
      where: {
        vehicleId,
        status: { in: BLOCKING_RESERVATION_STATUSES },
        ...(options.excludeReservationId
          ? { id: { not: options.excludeReservationId } }
          : {}),
        ...overlap,
      },
      select: { reference: true, startAt: true, endAt: true, status: true },
      orderBy: { startAt: "asc" },
    }),
    db.maintenance.findMany({
      where: {
        vehicleId,
        blocksAvailability: true,
        status: { in: [MaintenanceStatus.PLANNED, MaintenanceStatus.IN_PROGRESS] },
        ...overlap,
      },
      select: { startAt: true, endAt: true, description: true, type: true },
      orderBy: { startAt: "asc" },
    }),
  ]);

  return [
    ...reservations.map((r) => ({
      kind: "reservation" as const,
      from: r.startAt,
      to: r.endAt,
      label: `Réservation ${r.reference}`,
      reference: r.reference,
    })),
    ...maintenances.map((m) => ({
      kind: "maintenance" as const,
      from: m.startAt,
      to: m.endAt,
      label: m.description ?? "Immobilisation atelier",
    })),
  ].sort((a, b) => a.from.getTime() - b.from.getTime());
}

export async function isVehicleAvailable(
  vehicleId: string,
  start: Date,
  end: Date,
  options: { excludeReservationId?: string } = {},
): Promise<boolean> {
  const vehicle = await db.vehicle.findUnique({
    where: { id: vehicleId },
    select: { status: true, archivedAt: true },
  });
  if (!vehicle || vehicle.archivedAt) return false;
  if (vehicle.status === VehicleStatus.UNAVAILABLE) return false;

  const conflicts = await findConflicts(vehicleId, start, end, options);
  return conflicts.length === 0;
}

export type VehicleSearchFilters = {
  start?: Date;
  end?: Date;
  category?: string;
  transmission?: string;
  fuel?: string;
  seats?: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: "price-asc" | "price-desc" | "recent" | "popular";
  onlyAvailable?: boolean;
};

/**
 * Construit le filtre Prisma du catalogue public.
 * Quand une période est fournie, les véhicules déjà pris sur ces dates sont
 * écartés directement en SQL (`none`), pas après coup en JavaScript.
 */
export function buildVehicleWhere(
  filters: VehicleSearchFilters,
): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = {
    archivedAt: null,
    status: { notIn: [VehicleStatus.UNAVAILABLE, VehicleStatus.MAINTENANCE] },
  };

  if (filters.category) where.category = filters.category as never;
  if (filters.transmission) where.transmission = filters.transmission as never;
  if (filters.fuel) where.fuel = filters.fuel as never;
  if (filters.seats) where.seats = { gte: filters.seats };

  if (filters.minPrice != null || filters.maxPrice != null) {
    where.dailyRate = {
      ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
    };
  }

  if (filters.search) {
    const q = filters.search.trim();
    where.OR = [
      { brand: { contains: q, mode: "insensitive" } },
      { model: { contains: q, mode: "insensitive" } },
    ];
  }

  if (filters.start && filters.end) {
    const overlap = { startAt: { lt: filters.end }, endAt: { gt: filters.start } };
    where.reservations = {
      none: { status: { in: BLOCKING_RESERVATION_STATUSES }, ...overlap },
    };
    where.maintenances = {
      none: {
        blocksAvailability: true,
        status: { in: [MaintenanceStatus.PLANNED, MaintenanceStatus.IN_PROGRESS] },
        ...overlap,
      },
    };
  }

  return where;
}

export function buildVehicleOrderBy(
  sort: VehicleSearchFilters["sort"],
): Prisma.VehicleOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ dailyRate: "asc" }];
    case "price-desc":
      return [{ dailyRate: "desc" }];
    case "recent":
      return [{ createdAt: "desc" }];
    default:
      return [{ isFeatured: "desc" }, { dailyRate: "asc" }];
  }
}

/**
 * Périodes occupées d'un véhicule sur une fenêtre donnée.
 * Alimente le calendrier admin et l'encart « indisponible du … au … »
 * de la fiche véhicule publique.
 */
export async function getBlockedPeriods(
  vehicleId: string,
  from: Date,
  to: Date,
): Promise<Conflict[]> {
  return findConflicts(vehicleId, from, to);
}
