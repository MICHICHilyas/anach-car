"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  MaintenanceStatus,
  MaintenanceType,
  VehicleStatus,
} from "@/generated/prisma/enums";
import { requireUserOrThrow } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { toCents } from "@/lib/money";
import { localToUtc } from "@/lib/dates";
import { findConflicts } from "@/lib/availability";
import { MAINTENANCE_TYPE } from "@/lib/labels";
import type { ActionResult } from "@/server/actions/reservations";

function refresh(vehicleId?: string) {
  revalidatePath("/admin/maintenance");
  revalidatePath("/admin/calendrier");
  revalidatePath("/admin");
  if (vehicleId) revalidatePath(`/admin/vehicules/${vehicleId}`);
}

// ------------------------- Immobilisations garage -------------------------

const maintenanceSchema = z.object({
  vehicleId: z.string().min(1, "Véhicule obligatoire"),
  type: z.nativeEnum(MaintenanceType).default(MaintenanceType.REVISION),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de début invalide"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de fin invalide"),
  description: z.string().max(500).optional(),
  garage: z.string().max(120).optional(),
  estimatedCost: z.coerce.number().min(0).optional(),
  blocksAvailability: z.coerce.boolean().default(true),
});

/**
 * Planifie une immobilisation au garage.
 *
 * Le contrôle de conflit est essentiel : immobiliser un véhicule déjà réservé
 * mettrait l'agence en faute vis-à-vis d'un client. On refuse donc, en
 * nommant la réservation qui bloque.
 */
export async function createMaintenance(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    const parsed = maintenanceSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
    }
    const data = parsed.data;

    const startAt = localToUtc(data.startDate, "08:00");
    const endAt = localToUtc(data.endDate, "18:00");
    if (endAt <= startAt) {
      return { ok: false, error: "La date de fin doit être postérieure à la date de début." };
    }

    if (data.blocksAvailability) {
      const conflicts = await findConflicts(data.vehicleId, startAt, endAt);
      if (conflicts.length > 0) {
        return {
          ok: false,
          error: `Le véhicule est déjà pris sur cette période (${conflicts[0].label}). Annulez la réservation ou choisissez d'autres dates.`,
        };
      }
    }

    const maintenance = await db.maintenance.create({
      data: {
        vehicleId: data.vehicleId,
        type: data.type,
        startAt,
        endAt,
        description: data.description || null,
        garage: data.garage || null,
        estimatedCost: data.estimatedCost ? toCents(data.estimatedCost) : null,
        blocksAvailability: data.blocksAvailability,
      },
      select: { id: true, vehicle: { select: { brand: true, model: true } } },
    });

    await logAudit({
      user,
      action: "maintenance.create",
      summary: `Immobilisation planifiée — ${maintenance.vehicle.brand} ${maintenance.vehicle.model} (${MAINTENANCE_TYPE[data.type]})`,
      entityType: "Vehicle",
      entityId: data.vehicleId,
    });

    refresh(data.vehicleId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateMaintenanceStatus(
  id: string,
  status: MaintenanceStatus,
): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    const maintenance = await db.maintenance.update({
      where: { id },
      data: { status },
      select: {
        vehicleId: true,
        vehicle: { select: { brand: true, model: true, status: true } },
      },
    });

    // Le statut du véhicule suit l'immobilisation, sans jamais écraser
    // une location en cours.
    if (status === MaintenanceStatus.IN_PROGRESS) {
      await db.vehicle.update({
        where: { id: maintenance.vehicleId },
        data: { status: VehicleStatus.MAINTENANCE },
      });
    } else if (
      (status === MaintenanceStatus.DONE || status === MaintenanceStatus.CANCELLED) &&
      maintenance.vehicle.status === VehicleStatus.MAINTENANCE
    ) {
      await db.vehicle.update({
        where: { id: maintenance.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });
    }

    await logAudit({
      user,
      action: "maintenance.status",
      summary: `Immobilisation ${status} — ${maintenance.vehicle.brand} ${maintenance.vehicle.model}`,
      entityType: "Vehicle",
      entityId: maintenance.vehicleId,
    });

    refresh(maintenance.vehicleId);
    revalidatePath("/admin/vehicules");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteMaintenance(id: string): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow(["ADMIN", "MANAGER"]);
    const maintenance = await db.maintenance.delete({
      where: { id },
      select: { vehicleId: true },
    });
    await logAudit({
      user,
      action: "maintenance.delete",
      summary: "Immobilisation supprimée",
      entityType: "Vehicle",
      entityId: maintenance.vehicleId,
    });
    refresh(maintenance.vehicleId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// --------------------------- Historique d'entretien -----------------------

const recordSchema = z.object({
  vehicleId: z.string().min(1),
  type: z.nativeEnum(MaintenanceType),
  performedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  mileage: z.coerce.number().int().min(0).optional(),
  cost: z.coerce.number().min(0).default(0),
  garage: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
  /** Met à jour l'échéance de vidange du véhicule. */
  updateOilChange: z.coerce.boolean().default(false),
});

/**
 * Enregistre un entretien réalisé.
 *
 * Si c'est une vidange, la prochaine échéance du véhicule est recalculée
 * automatiquement : c'est ce qui rend l'alerte « vidange dans X km » fiable
 * sans double saisie.
 */
export async function createMaintenanceRecord(
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    const parsed = recordSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
    }
    const data = parsed.data;

    const vehicle = await db.vehicle.findUnique({
      where: { id: data.vehicleId },
      select: {
        brand: true,
        model: true,
        mileage: true,
        oilChangeIntervalKm: true,
      },
    });
    if (!vehicle) return { ok: false, error: "Véhicule introuvable." };

    const performedAt = new Date(`${data.performedAt}T12:00:00.000Z`);
    const mileage = data.mileage ?? vehicle.mileage;

    await db.$transaction(async (tx) => {
      await tx.maintenanceRecord.create({
        data: {
          vehicleId: data.vehicleId,
          type: data.type,
          performedAt,
          mileage,
          cost: toCents(data.cost),
          garage: data.garage || null,
          notes: data.notes || null,
          createdById: user.id,
        },
      });

      const isOilChange = data.type === MaintenanceType.OIL_CHANGE;
      if (isOilChange || data.updateOilChange) {
        await tx.vehicle.update({
          where: { id: data.vehicleId },
          data: {
            lastOilChangeMileage: mileage,
            lastOilChangeDate: performedAt,
            nextOilChangeMileage: mileage + vehicle.oilChangeIntervalKm,
            mileage: Math.max(mileage, vehicle.mileage),
          },
        });

        // Les alertes de vidange déjà émises deviennent caduques.
        await tx.notification.updateMany({
          where: {
            entityType: "Vehicle",
            entityId: data.vehicleId,
            type: { in: ["MAINTENANCE_DUE", "MAINTENANCE_OVERDUE"] },
            isRead: false,
          },
          data: { isRead: true, readAt: new Date(), readById: user.id },
        });
      }
    });

    await logAudit({
      user,
      action: "maintenance.record",
      summary: `${MAINTENANCE_TYPE[data.type]} enregistré(e) — ${vehicle.brand} ${vehicle.model} à ${mileage} km`,
      entityType: "Vehicle",
      entityId: data.vehicleId,
      metadata: { cost: toCents(data.cost), mileage },
    });

    refresh(data.vehicleId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteMaintenanceRecord(id: string): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow(["ADMIN", "MANAGER"]);
    const record = await db.maintenanceRecord.delete({
      where: { id },
      select: { vehicleId: true },
    });
    await logAudit({
      user,
      action: "maintenance.record.delete",
      summary: "Ligne d'entretien supprimée",
      entityType: "Vehicle",
      entityId: record.vehicleId,
    });
    refresh(record.vehicleId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown): { ok: false; error: string } {
  const message = error instanceof Error ? error.message : "Une erreur est survenue.";
  console.error("[maintenance]", error);
  return { ok: false, error: message };
}
