"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  FuelLevel,
  NotificationSeverity,
  NotificationType,
  PaymentStatus,
  ReservationStatus,
  VehicleStatus,
} from "@/generated/prisma/enums";
import { requireUserOrThrow } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { sendMail } from "@/lib/mailer";
import {
  reservationConfirmedForCustomer,
  reservationRejectedForCustomer,
} from "@/lib/emails/templates";
import { findConflicts } from "@/lib/availability";
import { getSettings } from "@/lib/settings";
import { buildQuote } from "@/lib/pricing";
import { localToUtc } from "@/lib/dates";
import { nextReservationReference } from "@/lib/reference";
import { toCents } from "@/lib/money";
import {
  storeIdentityDocuments,
  validateIdentityDocuments,
  type IdentityDocuments,
} from "@/lib/customer-documents";

/**
 * Cycle de vie d'une réservation, côté agence.
 *
 *   PENDING → CONFIRMED → ACTIVE → COMPLETED
 *      ↓          ↓
 *   REJECTED   CANCELLED
 *
 * Chaque transition vérifie l'état de départ : impossible de clôturer une
 * location jamais démarrée, ou de confirmer une demande déjà refusée.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const idSchema = z.string().min(1, "Identifiant manquant");

function refresh(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/reservations");
  revalidatePath("/admin/calendrier");
  revalidatePath("/admin/locations");
  if (id) revalidatePath(`/admin/reservations/${id}`);
}

/** Valide une demande : le véhicule est alors bloqué sur la période. */
export async function confirmReservation(id: string): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    const reservation = await loadReservation(id);

    if (reservation.status !== ReservationStatus.PENDING) {
      return {
        ok: false,
        error: `Seule une demande en attente peut être confirmée (statut actuel : ${reservation.status}).`,
      };
    }

    // La période a pu être prise entre-temps par une autre réservation.
    const conflicts = await findConflicts(
      reservation.vehicleId,
      reservation.startAt,
      reservation.endAt,
      { excludeReservationId: reservation.id },
    );
    if (conflicts.length > 0) {
      return {
        ok: false,
        error: `Conflit : le véhicule est déjà pris sur cette période (${conflicts[0].label}).`,
      };
    }

    await db.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmedById: user.id,
      },
    });

    await Promise.allSettled([
      logAudit({
        user,
        action: "reservation.confirm",
        summary: `Réservation ${reservation.reference} confirmée`,
        entityType: "Reservation",
        entityId: id,
      }),
      createNotification({
        type: NotificationType.RESERVATION_CONFIRMED,
        severity: NotificationSeverity.SUCCESS,
        title: `Réservation ${reservation.reference} confirmée`,
        message: `${reservation.customer.firstName} ${reservation.customer.lastName} · ${reservation.vehicle.brand} ${reservation.vehicle.model}`,
        link: `/admin/reservations/${id}`,
        entityType: "Reservation",
        entityId: id,
        dedupeKey: `confirmed:${id}`,
      }),
      reservation.customer.email
        ? sendMail({
            to: reservation.customer.email,
            ...reservationConfirmedForCustomer(toEmailData(reservation)),
          })
        : Promise.resolve(null),
    ]);

    refresh(id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Refuse une demande : la période est libérée immédiatement. */
export async function rejectReservation(
  id: string,
  reason?: string,
): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    const reservation = await loadReservation(id);

    if (reservation.status !== ReservationStatus.PENDING) {
      return { ok: false, error: "Seule une demande en attente peut être refusée." };
    }

    await db.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.REJECTED,
        cancelledAt: new Date(),
        cancellationReason: reason?.trim() || null,
      },
    });

    await Promise.allSettled([
      logAudit({
        user,
        action: "reservation.reject",
        summary: `Réservation ${reservation.reference} refusée`,
        entityType: "Reservation",
        entityId: id,
        metadata: { reason },
      }),
      reservation.customer.email
        ? sendMail({
            to: reservation.customer.email,
            ...reservationRejectedForCustomer({
              ...toEmailData(reservation),
              reason: reason ?? null,
            }),
          })
        : Promise.resolve(null),
    ]);

    refresh(id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Annule une réservation confirmée (à la demande du client ou de l'agence). */
export async function cancelReservation(
  id: string,
  reason?: string,
): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    const reservation = await loadReservation(id);

    if (
      reservation.status !== ReservationStatus.CONFIRMED &&
      reservation.status !== ReservationStatus.PENDING
    ) {
      return {
        ok: false,
        error:
          "Seule une réservation en attente ou confirmée peut être annulée. Une location en cours doit être clôturée.",
      };
    }

    await db.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason?.trim() || null,
      },
    });

    await Promise.allSettled([
      logAudit({
        user,
        action: "reservation.cancel",
        summary: `Réservation ${reservation.reference} annulée`,
        entityType: "Reservation",
        entityId: id,
        metadata: { reason },
      }),
      createNotification({
        type: NotificationType.RESERVATION_CANCELLED,
        severity: NotificationSeverity.WARNING,
        title: `Réservation ${reservation.reference} annulée`,
        message: reason ?? undefined,
        link: `/admin/reservations/${id}`,
        entityType: "Reservation",
        entityId: id,
        dedupeKey: `cancelled:${id}`,
      }),
    ]);

    refresh(id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

const startRentalSchema = z.object({
  reservationId: idSchema,
  startMileage: z.coerce.number().int().min(0, "Kilométrage invalide"),
  startFuel: z.nativeEnum(FuelLevel).default(FuelLevel.FULL),
  conditionNotes: z.string().max(1000).optional(),
});

/** Remise des clés : la réservation devient une location en cours. */
export async function startRental(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    const parsed = startRentalSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: firstIssue(parsed.error) };
    }
    const data = parsed.data;
    const reservation = await loadReservation(data.reservationId);

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      return {
        ok: false,
        error: "La réservation doit être confirmée avant de remettre le véhicule.",
      };
    }

    await db.$transaction(async (tx) => {
      await tx.rental.create({
        data: {
          reservationId: reservation.id,
          vehicleId: reservation.vehicleId,
          customerId: reservation.customerId,
          startedAt: new Date(),
          startMileage: data.startMileage,
          startFuel: data.startFuel,
          startConditionNotes: data.conditionNotes || null,
          checkedOutById: user.id,
        },
      });

      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.ACTIVE },
      });

      await tx.vehicle.update({
        where: { id: reservation.vehicleId },
        data: {
          status: VehicleStatus.RENTED,
          // Le compteur est mis à jour au départ : les alertes vidange
          // restent exactes même pendant la location.
          mileage: Math.max(data.startMileage, 0),
        },
      });
    });

    await logAudit({
      user,
      action: "rental.start",
      summary: `Départ du véhicule — réservation ${reservation.reference}`,
      entityType: "Reservation",
      entityId: reservation.id,
      metadata: { startMileage: data.startMileage },
    });

    refresh(reservation.id);
    revalidatePath("/admin/vehicules");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

const completeRentalSchema = z.object({
  reservationId: idSchema,
  endMileage: z.coerce.number().int().min(0, "Kilométrage invalide"),
  endFuel: z.nativeEnum(FuelLevel).default(FuelLevel.FULL),
  extraFees: z.coerce.number().min(0).default(0),
  extraFeesReason: z.string().max(500).optional(),
  damageNotes: z.string().max(1000).optional(),
});

/** Retour du véhicule : clôture la location et libère le véhicule. */
export async function completeRental(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    const parsed = completeRentalSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

    const data = parsed.data;
    const reservation = await db.reservation.findUnique({
      where: { id: data.reservationId },
      select: {
        id: true,
        reference: true,
        status: true,
        vehicleId: true,
        totalAmount: true,
        rental: { select: { id: true, startMileage: true } },
      },
    });

    if (!reservation) return { ok: false, error: "Réservation introuvable." };
    if (reservation.status !== ReservationStatus.ACTIVE || !reservation.rental) {
      return { ok: false, error: "Cette location n'est pas en cours." };
    }
    if (data.endMileage < reservation.rental.startMileage) {
      return {
        ok: false,
        error: `Le kilométrage de retour (${data.endMileage}) ne peut pas être inférieur à celui du départ (${reservation.rental.startMileage}).`,
      };
    }

    const extraFees = toCents(data.extraFees);

    await db.$transaction(async (tx) => {
      await tx.rental.update({
        where: { id: reservation.rental!.id },
        data: {
          endedAt: new Date(),
          endMileage: data.endMileage,
          endFuel: data.endFuel,
          damageNotes: data.damageNotes || null,
          extraFees,
          extraFeesReason: data.extraFeesReason || null,
          finalAmount: reservation.totalAmount + extraFees,
          checkedInById: user.id,
        },
      });

      await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          status: ReservationStatus.COMPLETED,
          extraFees: { increment: extraFees },
          totalAmount: { increment: extraFees },
        },
      });

      await tx.vehicle.update({
        where: { id: reservation.vehicleId },
        data: { status: VehicleStatus.AVAILABLE, mileage: data.endMileage },
      });

      await recomputePaymentStatus(tx, reservation.id);
    });

    await logAudit({
      user,
      action: "rental.complete",
      summary: `Retour du véhicule — réservation ${reservation.reference}`,
      entityType: "Reservation",
      entityId: reservation.id,
      metadata: { endMileage: data.endMileage, extraFees },
    });

    refresh(reservation.id);
    revalidatePath("/admin/vehicules");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateReservationNotes(
  id: string,
  notes: string,
): Promise<ActionResult> {
  try {
    const user = await requireUserOrThrow();
    await db.reservation.update({
      where: { id },
      data: { internalNotes: notes.trim() || null },
    });
    await logAudit({
      user,
      action: "reservation.notes",
      summary: "Note interne modifiée",
      entityType: "Reservation",
      entityId: id,
    });
    refresh(id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// --------------------------------------------------------------------------
// Utilitaires partagés
// --------------------------------------------------------------------------

const reservationDetailSelect = {
  id: true,
  reference: true,
  status: true,
  vehicleId: true,
  customerId: true,
  startAt: true,
  endAt: true,
  days: true,
  totalAmount: true,
  pickupLocationLabel: true,
  dropoffLocationLabel: true,
  customerComment: true,
  customer: {
    select: { id: true, firstName: true, lastName: true, phone: true, email: true },
  },
  vehicle: { select: { id: true, brand: true, model: true, plate: true } },
} satisfies Prisma.ReservationSelect;

async function loadReservation(id: string) {
  const reservation = await db.reservation.findUnique({
    where: { id },
    select: reservationDetailSelect,
  });
  if (!reservation) throw new Error("Réservation introuvable.");
  return reservation;
}

function toEmailData(
  reservation: Awaited<ReturnType<typeof loadReservation>>,
) {
  return {
    reference: reservation.reference,
    customerName: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
    customerPhone: reservation.customer.phone,
    customerEmail: reservation.customer.email,
    vehicleLabel: `${reservation.vehicle.brand} ${reservation.vehicle.model}`,
    startAt: reservation.startAt,
    endAt: reservation.endAt,
    days: reservation.days,
    totalAmount: reservation.totalAmount,
    pickupLocation: reservation.pickupLocationLabel,
    dropoffLocation: reservation.dropoffLocationLabel,
    comment: reservation.customerComment,
  };
}

/**
 * Recalcule le statut de paiement d'une réservation à partir des paiements
 * réellement enregistrés — jamais saisi à la main, donc toujours cohérent.
 */
export async function recomputePaymentStatus(
  tx: Prisma.TransactionClient,
  reservationId: string,
): Promise<void> {
  const reservation = await tx.reservation.findUnique({
    where: { id: reservationId },
    select: { totalAmount: true },
  });
  if (!reservation) return;

  const payments = await tx.payment.findMany({
    where: { reservationId },
    select: { amount: true, type: true },
  });

  const paid = payments.reduce((total, payment) => total + payment.amount, 0);

  let status: PaymentStatus = PaymentStatus.UNPAID;
  if (paid <= 0) status = PaymentStatus.UNPAID;
  else if (paid >= reservation.totalAmount) status = PaymentStatus.PAID;
  else if (payments.some((payment) => payment.type === "DEPOSIT") && paid < reservation.totalAmount)
    status = PaymentStatus.DEPOSIT_PAID;
  else status = PaymentStatus.PARTIALLY_PAID;

  await tx.reservation.update({ where: { id: reservationId }, data: { paymentStatus: status } });
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Données invalides.";
}

function failure(error: unknown): { ok: false; error: string } {
  const message =
    error instanceof Error ? error.message : "Une erreur est survenue.";
  if (!message.includes("Session expirée") && !message.includes("droits")) {
    console.error("[reservations]", error);
  }
  return { ok: false, error: message };
}

// --------------------------------------------------------------------------
// Réservation saisie au comptoir
// --------------------------------------------------------------------------

const adminReservationSchema = z.object({
  vehicleId: z.string().min(1, "Véhicule obligatoire"),
  customerId: z.string().optional(),
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().max(120).optional(),
  cin: z.string().trim().max(40).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de départ invalide"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).default("10:00"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de retour invalide"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).default("10:00"),
  source: z.enum(["PHONE", "WHATSAPP", "WALK_IN", "ADMIN"]).default("WALK_IN"),
  confirmImmediately: z.coerce.boolean().default(true),
  internalNotes: z.string().max(1000).optional(),
});

/**
 * Création d'une réservation par l'agence (téléphone, comptoir, WhatsApp).
 *
 * Différences avec le formulaire public : le délai minimum de réservation ne
 * s'applique pas (un client peut se présenter et partir tout de suite) et le
 * dossier peut être confirmé immédiatement. Le contrôle de chevauchement,
 * lui, reste identique — c'est la règle qui protège l'agence.
 */
export async function createAdminReservation(
  input: unknown,
  documents?: IdentityDocuments,
): Promise<ActionResult<{ id: string; reference: string }>> {
  try {
    const user = await requireUserOrThrow();
    const parsed = adminReservationSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
    }
    const data = parsed.data;

    /*
     * Au comptoir, les pièces sont facultatives : l'employé a les originaux
     * sous les yeux et peut les photographier plus tard depuis la fiche du
     * client. Format et taille restent contrôlés avant toute écriture.
     */
    const documentErrors = validateIdentityDocuments(documents);
    if (Object.keys(documentErrors).length > 0) {
      return { ok: false, error: Object.values(documentErrors)[0] };
    }

    if (!data.customerId && (!data.firstName || !data.lastName || !data.phone)) {
      return {
        ok: false,
        error: "Choisissez un client existant ou renseignez nom, prénom et téléphone.",
      };
    }

    const settings = await getSettings();
    const start = localToUtc(data.startDate, data.startTime);
    const end = localToUtc(data.endDate, data.endTime);

    if (end <= start) {
      return { ok: false, error: "La date de retour doit être postérieure au départ." };
    }

    const vehicle = await db.vehicle.findFirst({
      where: { id: data.vehicleId, archivedAt: null },
      select: {
        id: true,
        brand: true,
        model: true,
        category: true,
        dailyRate: true,
        rate3Days: true,
        weeklyRate: true,
        monthlyRate: true,
      },
    });
    if (!vehicle) return { ok: false, error: "Véhicule introuvable." };

    const rules = await db.pricingRule.findMany({ where: { isActive: true } });
    const quote = buildQuote(vehicle, start, end, {
      rules,
      graceMinutes: settings.reservation.graceMinutes,
    });

    const reservation = await db.$transaction(async (tx) => {
      const conflicts = await findConflicts(vehicle.id, start, end);
      if (conflicts.length > 0) {
        throw new Error(
          `Le véhicule est déjà pris sur cette période (${conflicts[0].label}).`,
        );
      }

      const customerId =
        data.customerId ??
        (
          await tx.customer.create({
            data: {
              firstName: data.firstName!,
              lastName: data.lastName!,
              phone: data.phone!,
              email: data.email ? data.email.toLowerCase() : null,
              cin: data.cin || null,
            },
            select: { id: true },
          })
        ).id;

      const reference = await nextReservationReference(tx, new Date());

      return tx.reservation.create({
        data: {
          reference,
          vehicleId: vehicle.id,
          customerId,
          startAt: start,
          endAt: end,
          days: quote.days,
          dailyRate: quote.dailyRate,
          subtotal: quote.subtotal,
          extraFees: quote.extraFees,
          discount: quote.discount,
          totalAmount: quote.total,
          priceBreakdown: quote.lines as never,
          status: data.confirmImmediately
            ? ReservationStatus.CONFIRMED
            : ReservationStatus.PENDING,
          confirmedAt: data.confirmImmediately ? new Date() : null,
          confirmedById: data.confirmImmediately ? user.id : null,
          source: data.source,
          internalNotes: data.internalNotes || null,
        },
        select: { id: true, reference: true, customerId: true },
      });
    });

    await storeIdentityDocuments({
      customerId: reservation.customerId,
      reservationId: reservation.id,
      documents,
      uploadedById: user.id,
      source: "comptoir",
    });

    await logAudit({
      user,
      action: "reservation.create",
      summary: `Réservation ${reservation.reference} créée au comptoir (${vehicle.brand} ${vehicle.model})`,
      entityType: "Reservation",
      entityId: reservation.id,
    });

    refresh(reservation.id);
    return {
      ok: true,
      data: { id: reservation.id, reference: reservation.reference },
    };
  } catch (error) {
    return failure(error);
  }
}
