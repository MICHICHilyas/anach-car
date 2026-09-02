"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserOrThrow } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { toCents } from "@/lib/money";
import { nextVehicleCode } from "@/lib/reference";
import { vehicleSchema } from "@/lib/validation/vehicle";
import { assertUploadAllowed, deleteStoredFile, putFile } from "@/lib/storage";
import { VehicleStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "@/server/actions/reservations";

/** Résultat enrichi : les erreurs sont replacées sous le bon champ du formulaire. */
export type VehicleActionResult =
  | { ok: true; data?: { id: string } }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function refresh(id?: string) {
  revalidatePath("/admin/vehicules");
  revalidatePath("/admin");
  revalidatePath("/fr/vehicules");
  if (id) revalidatePath(`/admin/vehicules/${id}`);
}

/** Convertit les champs du formulaire (dirhams, dates) en données de base. */
function toDbData(data: z.output<typeof vehicleSchema>) {
  const lastOil = data.lastOilChangeMileage ?? null;
  return {
    brand: data.brand,
    model: data.model,
    year: data.year,
    plate: data.plate.toUpperCase(),
    color: data.color || null,
    category: data.category,
    transmission: data.transmission,
    fuel: data.fuel,
    seats: data.seats,
    doors: data.doors,
    hasAirConditioning: data.hasAirConditioning,
    mileage: data.mileage,
    dailyRate: toCents(data.dailyRate),
    rate3Days: data.rate3Days != null ? toCents(data.rate3Days) : null,
    weeklyRate: data.weeklyRate != null ? toCents(data.weeklyRate) : null,
    monthlyRate: data.monthlyRate != null ? toCents(data.monthlyRate) : null,
    minRentalDays: data.minRentalDays,
    status: data.status,
    isFeatured: data.isFeatured,
    descriptionFr: data.descriptionFr || null,
    descriptionEn: data.descriptionEn || null,
    descriptionAr: data.descriptionAr || null,
    features: data.features,
    purchaseDate: data.purchaseDate,
    insuranceProvider: data.insuranceProvider || null,
    insuranceExpiry: data.insuranceExpiry,
    technicalInspectionExpiry: data.technicalInspectionExpiry,
    oilChangeIntervalKm: data.oilChangeIntervalKm,
    lastOilChangeMileage: lastOil,
    lastOilChangeDate: data.lastOilChangeDate,
    // La prochaine vidange se déduit du dernier entretien : c'est ce calcul
    // qui alimente l'alerte « vidange dans X km ».
    nextOilChangeMileage: lastOil != null ? lastOil + data.oilChangeIntervalKm : null,
    internalNotes: data.internalNotes || null,
  };
}

export async function createVehicle(
  input: unknown,
): Promise<VehicleActionResult> {
  try {
    const user = await requireUserOrThrow(["ADMIN", "MANAGER"]);
    const parsed = vehicleSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Certains champs sont incomplets ou invalides.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }
    const data = parsed.data;

    const existing = await db.vehicle.findUnique({
      where: { plate: data.plate.toUpperCase() },
      select: { id: true },
    });
    if (existing) {
      return {
        ok: false,
        error: `Un véhicule avec l'immatriculation ${data.plate.toUpperCase()} existe déjà.`,
      };
    }

    const vehicle = await db.$transaction(async (tx) => {
      const internalCode = await nextVehicleCode(tx);
      const baseSlug = slugify(`${data.brand} ${data.model} ${data.year}`);
      const slug = await uniqueSlug(tx, baseSlug);

      return tx.vehicle.create({
        data: { ...toDbData(data), internalCode, slug },
        select: { id: true, brand: true, model: true },
      });
    });

    await logAudit({
      user,
      action: "vehicle.create",
      summary: `Véhicule ${vehicle.brand} ${vehicle.model} ajouté`,
      entityType: "Vehicle",
      entityId: vehicle.id,
    });

    refresh(vehicle.id);
    return { ok: true, data: { id: vehicle.id } };
  } catch (error) {
    return failure(error);
  }
}

export async function updateVehicle(
  id: string,
  input: unknown,
): Promise<VehicleActionResult> {
  try {
    const user = await requireUserOrThrow(["ADMIN", "MANAGER"]);
    const parsed = vehicleSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Certains champs sont incomplets ou invalides.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }
    const data = parsed.data;

    const duplicate = await db.vehicle.findFirst({
      where: { plate: data.plate.toUpperCase(), id: { not: id } },
      select: { id: true },
    });
    if (duplicate) {
      return {
        ok: false,
        error: "Cette immatriculation est déjà utilisée.",
        fieldErrors: { plate: "Immatriculation déjà utilisée" },
      };
    }

    const vehicle = await db.vehicle.update({
      where: { id },
      data: toDbData(data),
      select: { id: true, brand: true, model: true },
    });

    await logAudit({
      user,
      action: "vehicle.update",
      summary: `Véhicule ${vehicle.brand} ${vehicle.model} modifié`,
      entityType: "Vehicle",
      entityId: id,
    });

    refresh(id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Archivage : le véhicule sort du catalogue public et ne peut plus être
 * réservé, mais tout son historique (locations, entretiens, comptabilité)
 * reste intact. C'est l'opération à privilégier sur la suppression.
 */
export async function archiveVehicle(id: string): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow(["ADMIN", "MANAGER"]);

    const upcoming = await db.reservation.count({
      where: {
        vehicleId: id,
        status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
        endAt: { gte: new Date() },
      },
    });
    if (upcoming > 0) {
      return {
        ok: false,
        error: `Impossible d'archiver : ${upcoming} réservation(s) en cours ou à venir sur ce véhicule. Annulez-les d'abord.`,
      };
    }

    const vehicle = await db.vehicle.update({
      where: { id },
      data: { archivedAt: new Date(), status: VehicleStatus.UNAVAILABLE },
      select: { brand: true, model: true },
    });

    await logAudit({
      user,
      action: "vehicle.archive",
      summary: `Véhicule ${vehicle.brand} ${vehicle.model} archivé`,
      entityType: "Vehicle",
      entityId: id,
    });

    refresh(id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function restoreVehicle(id: string): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow(["ADMIN", "MANAGER"]);
    const vehicle = await db.vehicle.update({
      where: { id },
      data: { archivedAt: null, status: VehicleStatus.AVAILABLE },
      select: { brand: true, model: true },
    });
    await logAudit({
      user,
      action: "vehicle.restore",
      summary: `Véhicule ${vehicle.brand} ${vehicle.model} remis en service`,
      entityType: "Vehicle",
      entityId: id,
    });
    refresh(id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Suppression définitive : autorisée uniquement si le véhicule n'a aucune
 * histoire. Dès qu'une réservation existe, l'archivage s'impose pour ne pas
 * trouer la comptabilité.
 */
export async function deleteVehicle(id: string): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow(["ADMIN"]);

    const [reservations, rentals, vehicle] = await Promise.all([
      db.reservation.count({ where: { vehicleId: id } }),
      db.rental.count({ where: { vehicleId: id } }),
      db.vehicle.findUnique({
        where: { id },
        select: { brand: true, model: true, images: { select: { url: true } } },
      }),
    ]);
    if (!vehicle) return { ok: false, error: "Véhicule introuvable." };

    if (reservations > 0 || rentals > 0) {
      return {
        ok: false,
        error: `Suppression impossible : ce véhicule a ${reservations} réservation(s) et ${rentals} location(s) dans l'historique. Archivez-le pour le retirer de la location tout en conservant ses données.`,
      };
    }

    await db.vehicle.delete({ where: { id } });

    // Les fichiers sont supprimés après la base : un fichier orphelin est
    // moins grave qu'une fiche qui pointe vers un fichier disparu.
    for (const image of vehicle.images) {
      const key = image.url.replace("/api/media/", "");
      await deleteStoredFile(key);
    }

    await logAudit({
      user,
      action: "vehicle.delete",
      summary: `Véhicule ${vehicle.brand} ${vehicle.model} supprimé définitivement`,
      entityType: "Vehicle",
      entityId: id,
    });

    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function setVehicleStatus(
  id: string,
  status: VehicleStatus,
): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    const vehicle = await db.vehicle.update({
      where: { id },
      data: { status },
      select: { brand: true, model: true },
    });
    await logAudit({
      user,
      action: "vehicle.status",
      summary: `Statut de ${vehicle.brand} ${vehicle.model} : ${status}`,
      entityType: "Vehicle",
      entityId: id,
    });
    refresh(id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Mise à jour rapide du compteur — recalcule l'échéance de vidange. */
export async function updateMileage(
  id: string,
  mileage: number,
): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    if (!Number.isFinite(mileage) || mileage < 0) {
      return { ok: false, error: "Kilométrage invalide." };
    }
    const vehicle = await db.vehicle.update({
      where: { id },
      data: { mileage: Math.round(mileage) },
      select: { brand: true, model: true },
    });
    await logAudit({
      user,
      action: "vehicle.mileage",
      summary: `Kilométrage de ${vehicle.brand} ${vehicle.model} : ${mileage} km`,
      entityType: "Vehicle",
      entityId: id,
    });
    refresh(id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// ----------------------------- Photos -------------------------------------

export async function uploadVehicleImage(
  vehicleId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "Aucun fichier reçu." };

    assertUploadAllowed(file, "vehicles");
    const stored = await putFile(file, "vehicles");

    const count = await db.vehicleImage.count({ where: { vehicleId } });
    await db.vehicleImage.create({
      data: {
        vehicleId,
        url: stored.url,
        alt: null,
        position: count,
        isPrimary: count === 0,
      },
    });

    await logAudit({
      user,
      action: "vehicle.image.add",
      summary: "Photo de véhicule ajoutée",
      entityType: "Vehicle",
      entityId: vehicleId,
    });

    refresh(vehicleId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteVehicleImage(imageId: string): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    const image = await db.vehicleImage.findUnique({
      where: { id: imageId },
      select: { id: true, url: true, vehicleId: true, isPrimary: true },
    });
    if (!image) return { ok: false, error: "Photo introuvable." };

    await db.vehicleImage.delete({ where: { id: imageId } });
    await deleteStoredFile(image.url.replace("/api/media/", ""));

    // Si la photo principale disparaît, la suivante prend sa place.
    if (image.isPrimary) {
      const next = await db.vehicleImage.findFirst({
        where: { vehicleId: image.vehicleId },
        orderBy: { position: "asc" },
        select: { id: true },
      });
      if (next) {
        await db.vehicleImage.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }

    await logAudit({
      user,
      action: "vehicle.image.delete",
      summary: "Photo de véhicule supprimée",
      entityType: "Vehicle",
      entityId: image.vehicleId,
    });

    refresh(image.vehicleId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function setPrimaryImage(imageId: string): Promise<ActionResult> {
  try {
    await requireUserOrThrow();
    const image = await db.vehicleImage.findUnique({
      where: { id: imageId },
      select: { vehicleId: true },
    });
    if (!image) return { ok: false, error: "Photo introuvable." };

    await db.$transaction([
      db.vehicleImage.updateMany({
        where: { vehicleId: image.vehicleId },
        data: { isPrimary: false },
      }),
      db.vehicleImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
    ]);

    refresh(image.vehicleId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// ----------------------------- Utilitaires --------------------------------

async function uniqueSlug(
  tx: { vehicle: { findUnique: (args: { where: { slug: string }; select: { id: true } }) => Promise<unknown> } },
  base: string,
): Promise<string> {
  let candidate = base;
  let suffix = 2;
  while (await tx.vehicle.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function failure(error: unknown): { ok: false; error: string } {
  const message = error instanceof Error ? error.message : "Une erreur est survenue.";
  console.error("[vehicles]", error);
  return { ok: false, error: message };
}
