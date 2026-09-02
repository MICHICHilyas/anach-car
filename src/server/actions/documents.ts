"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { DocumentType } from "@/generated/prisma/enums";
import { requireUserOrThrow } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { assertUploadAllowed, deleteStoredFile, putFile } from "@/lib/storage";
import { DOCUMENT_TYPE } from "@/lib/labels";
import type { ActionResult } from "@/server/actions/reservations";

/**
 * Documents clients et véhicules.
 *
 * Les fichiers sont déposés hors du dossier public et ne sont lisibles que
 * via /api/admin/documents/[id]/file, qui exige une session valide.
 */
export async function uploadDocument(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();

    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "Aucun fichier reçu." };

    const type = String(formData.get("type") ?? "OTHER");
    if (!(type in DocumentType)) {
      return { ok: false, error: "Type de document invalide." };
    }

    const customerId = asString(formData.get("customerId"));
    const vehicleId = asString(formData.get("vehicleId"));
    const reservationId = asString(formData.get("reservationId"));
    if (!customerId && !vehicleId && !reservationId) {
      return {
        ok: false,
        error: "Un document doit être rattaché à un client, un véhicule ou une réservation.",
      };
    }

    assertUploadAllowed(file, "documents");
    const stored = await putFile(file, "documents");
    const expiresAt = asString(formData.get("expiresAt"));

    const document = await db.document.create({
      data: {
        type: type as DocumentType,
        title: asString(formData.get("title")),
        fileName: file.name,
        storageKey: stored.key,
        mimeType: file.type,
        size: file.size,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        customerId,
        vehicleId,
        reservationId,
        uploadedById: user.id,
      },
      select: { id: true },
    });

    await logAudit({
      user,
      action: "document.upload",
      summary: `Document « ${DOCUMENT_TYPE[type as DocumentType]} » ajouté`,
      entityType: "Document",
      entityId: document.id,
      metadata: { customerId, vehicleId, reservationId },
    });

    revalidatePath("/admin/documents");
    if (customerId) revalidatePath(`/admin/clients/${customerId}`);
    if (vehicleId) revalidatePath(`/admin/vehicules/${vehicleId}`);
    if (reservationId) revalidatePath(`/admin/reservations/${reservationId}`);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow(["ADMIN", "MANAGER"]);
    const document = await db.document.findUnique({
      where: { id },
      select: {
        storageKey: true,
        fileName: true,
        customerId: true,
        vehicleId: true,
        reservationId: true,
      },
    });
    if (!document) return { ok: false, error: "Document introuvable." };

    await db.document.delete({ where: { id } });
    await deleteStoredFile(document.storageKey);

    await logAudit({
      user,
      action: "document.delete",
      summary: `Document « ${document.fileName} » supprimé`,
      entityType: "Document",
      entityId: id,
    });

    revalidatePath("/admin/documents");
    if (document.customerId) revalidatePath(`/admin/clients/${document.customerId}`);
    if (document.vehicleId) revalidatePath(`/admin/vehicules/${document.vehicleId}`);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

function asString(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function failure(error: unknown): { ok: false; error: string } {
  const message = error instanceof Error ? error.message : "Une erreur est survenue.";
  console.error("[documents]", error);
  return { ok: false, error: message };
}
