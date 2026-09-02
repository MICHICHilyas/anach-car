"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { PaymentMethod, PaymentType } from "@/generated/prisma/enums";
import { requireUserOrThrow } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { toCents } from "@/lib/money";
import { formatMoney } from "@/lib/money";
import { recomputePaymentStatus, type ActionResult } from "@/server/actions/reservations";

const paymentSchema = z.object({
  reservationId: z.string().min(1),
  amount: z.coerce.number().refine((value) => value !== 0, "Le montant ne peut pas être nul"),
  type: z.nativeEnum(PaymentType).default(PaymentType.BALANCE),
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  reference: z.string().max(60).optional(),
  note: z.string().max(500).optional(),
  paidAt: z.string().optional(),
});

/** Enregistre un encaissement et met à jour le statut de paiement du dossier. */
export async function recordPayment(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    const parsed = paymentSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
    }
    const data = parsed.data;

    const reservation = await db.reservation.findUnique({
      where: { id: data.reservationId },
      select: { id: true, reference: true, customerId: true },
    });
    if (!reservation) return { ok: false, error: "Réservation introuvable." };

    // Un remboursement est saisi en positif et stocké en négatif.
    const signed =
      data.type === PaymentType.REFUND
        ? -Math.abs(toCents(data.amount))
        : toCents(data.amount);

    await db.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          reservationId: reservation.id,
          customerId: reservation.customerId,
          amount: signed,
          type: data.type,
          method: data.method,
          reference: data.reference || null,
          note: data.note || null,
          paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
          recordedById: user.id,
        },
      });
      await recomputePaymentStatus(tx, reservation.id);
    });

    await logAudit({
      user,
      action: "payment.create",
      summary: `Paiement de ${formatMoney(signed)} enregistré sur ${reservation.reference}`,
      entityType: "Reservation",
      entityId: reservation.id,
      metadata: { amount: signed, type: data.type, method: data.method },
    });

    revalidatePath(`/admin/reservations/${reservation.id}`);
    revalidatePath("/admin/paiements");
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Une erreur est survenue.",
    };
  }
}

export async function deletePayment(id: string): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow(["ADMIN", "MANAGER"]);
    const payment = await db.payment.findUnique({
      where: { id },
      select: { id: true, amount: true, reservationId: true },
    });
    if (!payment) return { ok: false, error: "Paiement introuvable." };

    await db.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id } });
      if (payment.reservationId) {
        await recomputePaymentStatus(tx, payment.reservationId);
      }
    });

    await logAudit({
      user,
      action: "payment.delete",
      summary: `Paiement de ${formatMoney(payment.amount)} supprimé`,
      entityType: "Payment",
      entityId: id,
    });

    if (payment.reservationId) {
      revalidatePath(`/admin/reservations/${payment.reservationId}`);
    }
    revalidatePath("/admin/paiements");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Une erreur est survenue.",
    };
  }
}
