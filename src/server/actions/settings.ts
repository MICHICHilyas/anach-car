"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserOrThrow } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { updateSettings } from "@/lib/settings";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import type { ActionResult } from "@/server/actions/reservations";

const settingsSchema = z.object({
  agency: z.object({
    name: z.string().trim().min(1).max(80),
    phone: z.string().trim().max(40),
    mobile: z.string().trim().max(40),
    whatsapp: z.string().trim().max(20),
    email: z.string().trim().email().max(120),
    address: z.string().trim().max(200),
    openingHours: z.string().trim().max(200),
  }),
  reservation: z.object({
    minRentalDays: z.coerce.number().int().min(1).max(30),
    maxRentalDays: z.coerce.number().int().min(1).max(365),
    minAdvanceHours: z.coerce.number().int().min(0).max(168),
    graceMinutes: z.coerce.number().int().min(0).max(720),
    cancellationPolicy: z.string().trim().max(500),
    requireDriverLicense: z.coerce.boolean(),
    requireDocumentsAtBooking: z.coerce.boolean(),
  }),
  maintenance: z.object({
    oilChangeAlertKm: z.coerce.number().int().min(50).max(5000),
    insuranceAlertDays: z.coerce.number().int().min(1).max(180),
    inspectionAlertDays: z.coerce.number().int().min(1).max(180),
    documentAlertDays: z.coerce.number().int().min(1).max(180),
  }),
  notifications: z.object({
    dashboardEnabled: z.coerce.boolean(),
    emailEnabled: z.coerce.boolean(),
    whatsappEnabled: z.coerce.boolean(),
  }),
});

/** Enregistre les paramètres de l'agence (règles métier, seuils d'alerte). */
export async function saveSettings(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow(["ADMIN", "MANAGER"]);
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
    }

    await updateSettings(parsed.data);

    await logAudit({
      user,
      action: "settings.update",
      summary: "Paramètres de l'agence modifiés",
    });

    revalidatePath("/admin/parametres");
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function markNotification(id: string): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    await markNotificationRead(id, user.id);
    revalidatePath("/admin/notifications");
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function markAllNotifications(): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    await markAllNotificationsRead(user.id);
    revalidatePath("/admin/notifications");
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown): { ok: false; error: string } {
  const message = error instanceof Error ? error.message : "Une erreur est survenue.";
  console.error("[settings]", error);
  return { ok: false, error: message };
}
