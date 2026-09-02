import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  buildVehicleOrderBy,
  buildVehicleWhere,
  type VehicleSearchFilters,
} from "@/lib/availability";

/**
 * Requêtes de lecture du catalogue public.
 * `select` explicite partout : aucune donnée interne (notes, coûts, dates
 * d'assurance) ne doit sortir vers le site public.
 */

const publicVehicleSelect = {
  id: true,
  slug: true,
  brand: true,
  model: true,
  year: true,
  category: true,
  transmission: true,
  fuel: true,
  seats: true,
  doors: true,
  hasAirConditioning: true,
  mileage: true,
  dailyRate: true,
  rate3Days: true,
  weeklyRate: true,
  monthlyRate: true,
  minRentalDays: true,
  status: true,
  isFeatured: true,
  descriptionFr: true,
  descriptionEn: true,
  descriptionAr: true,
  features: true,
  images: {
    select: { url: true, alt: true, isPrimary: true, position: true },
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
  },
  // `satisfies` (et non `as const`) : le type reste vérifié par Prisma tout en
  // gardant les tableaux `orderBy` mutables, comme le client l'exige.
} satisfies Prisma.VehicleSelect;

export type PublicVehicle = Awaited<ReturnType<typeof getVehicleBySlug>>;

export async function getVehicleBySlug(slug: string) {
  return db.vehicle.findFirst({
    where: { slug, archivedAt: null },
    select: publicVehicleSelect,
  });
}

export async function getFeaturedVehicles(limit = 6) {
  return db.vehicle.findMany({
    where: { archivedAt: null, status: { not: "UNAVAILABLE" } },
    select: publicVehicleSelect,
    orderBy: [{ isFeatured: "desc" }, { dailyRate: "asc" }],
    take: limit,
  });
}

export async function searchVehicles(filters: VehicleSearchFilters) {
  const where = buildVehicleWhere(filters);
  const [items, total] = await Promise.all([
    db.vehicle.findMany({
      where,
      select: publicVehicleSelect,
      orderBy: buildVehicleOrderBy(filters.sort),
      take: 60,
    }),
    db.vehicle.count({ where }),
  ]);
  return { items, total };
}

/** Véhicules proches (même catégorie) pour la fiche produit. */
export async function getSimilarVehicles(
  vehicleId: string,
  category: string,
  limit = 3,
) {
  return db.vehicle.findMany({
    where: {
      archivedAt: null,
      status: { not: "UNAVAILABLE" },
      id: { not: vehicleId },
      category: category as never,
    },
    select: publicVehicleSelect,
    orderBy: { dailyRate: "asc" },
    take: limit,
  });
}

export async function getPickupLocations() {
  return db.location.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      nameEn: true,
      nameAr: true,
      extraFee: true,
      isPickup: true,
      isDropoff: true,
    },
  });
}

/** Fourchette de prix de la flotte, pour calibrer le filtre « prix max ». */
export async function getPriceRange() {
  const result = await db.vehicle.aggregate({
    where: { archivedAt: null },
    _min: { dailyRate: true },
    _max: { dailyRate: true },
  });
  return {
    min: result._min.dailyRate ?? 0,
    max: result._max.dailyRate ?? 100000,
  };
}

/**
 * Marques, modèles et couleurs déjà présents dans la flotte.
 *
 * Sert à alimenter les suggestions du formulaire véhicule : ce que l'agence
 * a saisi une fois lui est reproposé, ce qui évite les variantes
 * orthographiques d'un même modèle.
 */
export async function getFleetSuggestions() {
  const rows = await db.vehicle.findMany({
    select: { brand: true, model: true, color: true },
  });

  const modelsByBrand: Record<string, string[]> = {};
  for (const row of rows) {
    const key = row.brand.trim().toLowerCase();
    if (!key) continue;
    const list = (modelsByBrand[key] ??= []);
    if (row.model && !list.includes(row.model)) list.push(row.model);
  }

  return {
    brands: unique(rows.map((row) => row.brand)),
    modelsByBrand,
    colors: unique(rows.map((row) => row.color)),
  };
}

function unique(values: (string | null)[]): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value?.trim()))),
  );
}
