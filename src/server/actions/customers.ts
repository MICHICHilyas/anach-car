"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { CustomerStatus } from "@/generated/prisma/enums";
import { requireUserOrThrow } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/server/actions/reservations";

const customerSchema = z.object({
  firstName: z.string().trim().min(2, "Le prénom est obligatoire").max(60),
  lastName: z.string().trim().min(2, "Le nom est obligatoire").max(60),
  phone: z.string().trim().min(9, "Téléphone invalide").max(20),
  email: z.string().trim().email("Email invalide").max(120).optional().or(z.literal("")),
  cin: z.string().trim().max(40).optional().or(z.literal("")),
  licenseNumber: z.string().trim().max(40).optional().or(z.literal("")),
  country: z.string().trim().max(60).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  internalNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});

function toData(data: z.output<typeof customerSchema>) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    email: data.email ? data.email.toLowerCase() : null,
    cin: data.cin || null,
    licenseNumber: data.licenseNumber || null,
    country: data.country || "Maroc",
    city: data.city || null,
    address: data.address || null,
    internalNotes: data.internalNotes || null,
  };
}

export async function createCustomer(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUserOrThrow();
    const parsed = customerSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
    }

    const customer = await db.customer.create({
      data: toData(parsed.data),
      select: { id: true, firstName: true, lastName: true },
    });

    await logAudit({
      user,
      action: "customer.create",
      summary: `Client ${customer.firstName} ${customer.lastName} créé`,
      entityType: "Customer",
      entityId: customer.id,
    });

    revalidatePath("/admin/clients");
    return { ok: true, data: { id: customer.id } };
  } catch (error) {
    return failure(error);
  }
}

export async function updateCustomer(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    const parsed = customerSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
    }

    const customer = await db.customer.update({
      where: { id },
      data: toData(parsed.data),
      select: { firstName: true, lastName: true },
    });

    await logAudit({
      user,
      action: "customer.update",
      summary: `Fiche client ${customer.firstName} ${customer.lastName} modifiée`,
      entityType: "Customer",
      entityId: id,
    });

    revalidatePath("/admin/clients");
    revalidatePath(`/admin/clients/${id}`);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateCustomerNotes(
  id: string,
  notes: string,
): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    await db.customer.update({
      where: { id },
      data: { internalNotes: notes.trim() || null },
    });
    await logAudit({
      user,
      action: "customer.notes",
      summary: "Note interne client modifiée",
      entityType: "Customer",
      entityId: id,
    });
    revalidatePath(`/admin/clients/${id}`);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Liste noire : le client reste visible mais signalé dans toute l'interface. */
export async function setCustomerStatus(
  id: string,
  status: CustomerStatus,
): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow(["ADMIN", "MANAGER"]);
    const customer = await db.customer.update({
      where: { id },
      data: { status },
      select: { firstName: true, lastName: true },
    });
    await logAudit({
      user,
      action: "customer.status",
      summary: `${customer.firstName} ${customer.lastName} — statut : ${status}`,
      entityType: "Customer",
      entityId: id,
    });
    revalidatePath("/admin/clients");
    revalidatePath(`/admin/clients/${id}`);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Suppression d'un client. Refusée s'il a un historique : les réservations
 * passées doivent rester rattachées à quelqu'un pour la comptabilité.
 */
export async function deleteCustomer(id: string): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow(["ADMIN"]);
    const reservations = await db.reservation.count({ where: { customerId: id } });
    if (reservations > 0) {
      return {
        ok: false,
        error: `Suppression impossible : ce client a ${reservations} réservation(s). Vous pouvez l'archiver à la place.`,
      };
    }

    const customer = await db.customer.delete({
      where: { id },
      select: { firstName: true, lastName: true },
    });

    await logAudit({
      user,
      action: "customer.delete",
      summary: `Client ${customer.firstName} ${customer.lastName} supprimé`,
      entityType: "Customer",
      entityId: id,
    });

    revalidatePath("/admin/clients");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function archiveCustomer(id: string): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow(["ADMIN", "MANAGER"]);
    const customer = await db.customer.update({
      where: { id },
      data: { archivedAt: new Date() },
      select: { firstName: true, lastName: true },
    });
    await logAudit({
      user,
      action: "customer.archive",
      summary: `Client ${customer.firstName} ${customer.lastName} archivé`,
      entityType: "Customer",
      entityId: id,
    });
    revalidatePath("/admin/clients");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown): { ok: false; error: string } {
  const message = error instanceof Error ? error.message : "Une erreur est survenue.";
  console.error("[customers]", error);
  return { ok: false, error: message };
}
