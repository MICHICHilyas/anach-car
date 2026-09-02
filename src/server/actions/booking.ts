"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { buildQuote, type Quote } from "@/lib/pricing";
import { findConflicts, validatePeriod } from "@/lib/availability";
import { localToUtc, formatDateTime } from "@/lib/dates";
import { nextReservationReference } from "@/lib/reference";
import { rateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";
import { sendMail } from "@/lib/mailer";
import {
  newReservationForAgency,
  reservationReceivedForCustomer,
} from "@/lib/emails/templates";
import {
  createReservationSchema,
  quoteInputSchema,
} from "@/lib/validation/reservation";
import { NotificationSeverity, NotificationType } from "@/generated/prisma/enums";
import { signReference } from "@/lib/tokens";
import { CUSTOM_LOCATION } from "@/lib/search-params";
import {
  storeIdentityDocuments,
  validateIdentityDocuments,
  type IdentityDocuments,
} from "@/lib/customer-documents";

/**
 * Actions publiques du parcours de réservation.
 *
 * Toute la logique métier (disponibilité, prix, création) vit ici, côté
 * serveur. Le navigateur ne fait qu'afficher le résultat : modifier le prix
 * dans les outils de développement n'a aucun effet sur la réservation créée.
 */

export type QuoteResult =
  | {
      ok: true;
      available: true;
      quote: Quote;
      conflicts: never[];
    }
  | {
      ok: true;
      available: false;
      quote: Quote | null;
      conflicts: { from: string; to: string; label: string }[];
    }
  | { ok: false; error: string };

/** Vérifie la disponibilité réelle et calcule le devis pour une période. */
export async function getQuote(input: unknown): Promise<QuoteResult> {
  const parsed = quoteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dates ou véhicule invalides." };
  }

  const { vehicleId, startDate, startTime, endDate, endTime } = parsed.data;
  const settings = await getSettings();

  let start: Date;
  let end: Date;
  try {
    start = localToUtc(startDate, startTime);
    end = localToUtc(endDate, endTime);
  } catch {
    return { ok: false, error: "Dates invalides." };
  }

  const period = validatePeriod(start, end, settings);
  if (!period.ok) return { ok: false, error: period.error };

  const vehicle = await db.vehicle.findFirst({
    where: { id: vehicleId, archivedAt: null },
    select: {
      id: true,
      category: true,
      dailyRate: true,
      rate3Days: true,
      weeklyRate: true,
      monthlyRate: true,
      minRentalDays: true,
      status: true,
    },
  });
  if (!vehicle) return { ok: false, error: "Véhicule introuvable." };

  if (period.days < vehicle.minRentalDays) {
    return {
      ok: false,
      error: `Ce véhicule se loue à partir de ${vehicle.minRentalDays} jour(s).`,
    };
  }

  const [rules, locationFees] = await Promise.all([
    db.pricingRule.findMany({ where: { isActive: true } }),
    // Une adresse libre ne porte aucun supplément automatique.
    resolveLocationFees(
      parsed.data.pickupLocationId === CUSTOM_LOCATION
        ? null
        : parsed.data.pickupLocationId,
      parsed.data.dropoffLocationId === CUSTOM_LOCATION
        ? null
        : parsed.data.dropoffLocationId,
    ),
  ]);

  const quote = buildQuote(vehicle, start, end, {
    rules,
    locationFees,
    graceMinutes: settings.reservation.graceMinutes,
  });

  const conflicts = await findConflicts(vehicle.id, start, end);
  if (conflicts.length > 0 || vehicle.status === "UNAVAILABLE") {
    return {
      ok: true,
      available: false,
      quote,
      conflicts: conflicts.map((conflict) => ({
        from: formatDateTime(conflict.from),
        to: formatDateTime(conflict.to),
        label: conflict.label,
      })),
    };
  }

  return { ok: true, available: true, quote, conflicts: [] };
}

export type CreateReservationResult =
  | { ok: true; reference: string; token: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Pièces justificatives jointes à la demande.
 *
 * Elles transitent par la server action, jamais par une route publique
 * d'upload : rien n'est écrit sur disque tant que le reste du formulaire
 * n'est pas valide, et la limitation de débit du formulaire les protège.
 */
export type BookingDocuments = IdentityDocuments;

/**
 * Crée une demande de réservation au statut PENDING.
 *
 * Rien n'est confirmé automatiquement : l'agence valide depuis le dashboard.
 * La création est transactionnelle et la contrainte d'exclusion PostgreSQL
 * garantit qu'aucune période ne peut être vendue deux fois, même si deux
 * clients valident le formulaire à la même seconde.
 */
export async function createReservation(
  input: unknown,
  documents?: BookingDocuments,
): Promise<CreateReservationResult> {
  const parsed = createReservationSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      ok: false,
      error: "Certaines informations sont incomplètes ou invalides.",
      fieldErrors,
    };
  }

  const data = parsed.data;

  // Pot de miel : un robot qui remplit le champ caché est ignoré silencieusement.
  if (data.website) {
    return { ok: false, error: "Requête invalide." };
  }

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = rateLimit(`reservation:${ip}`, 5, 600);
  if (!limit.allowed) {
    return {
      ok: false,
      error: `Trop de demandes envoyées. Réessayez dans ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s) ou appelez-nous.`,
    };
  }

  const settings = await getSettings();

  // --- Pièces justificatives ---------------------------------------------
  const documentErrors = validateIdentityDocuments(documents, {
    required: settings.reservation.requireDocumentsAtBooking,
  });

  if (Object.keys(documentErrors).length > 0) {
    return {
      ok: false,
      error: "Merci de joindre vos pièces justificatives.",
      fieldErrors: documentErrors,
    };
  }

  const start = localToUtc(data.startDate, data.startTime);
  const end = localToUtc(data.endDate, data.endTime);

  /*
   * Une adresse libre n'a pas d'existence en base : on n'enregistre alors
   * aucun identifiant de lieu, seulement le libellé saisi. C'est ce qui
   * permet au client de demander « Hôtel Riu, Taghazout » sans que l'agence
   * ait à créer un lieu pour chaque adresse possible.
   */
  const pickupText = data.pickupLocationText?.trim() || null;
  const dropoffText = data.dropoffLocationText?.trim() || null;
  const pickupId =
    data.pickupLocationId && data.pickupLocationId !== CUSTOM_LOCATION
      ? data.pickupLocationId
      : null;
  const dropoffId =
    data.dropoffLocationId && data.dropoffLocationId !== CUSTOM_LOCATION
      ? data.dropoffLocationId
      : null;

  const period = validatePeriod(start, end, settings);
  if (!period.ok) return { ok: false, error: period.error };

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
      minRentalDays: true,
      status: true,
    },
  });
  if (!vehicle || vehicle.status === "UNAVAILABLE") {
    return { ok: false, error: "Ce véhicule n'est plus proposé à la location." };
  }
  if (period.days < vehicle.minRentalDays) {
    return {
      ok: false,
      error: `Ce véhicule se loue à partir de ${vehicle.minRentalDays} jour(s).`,
    };
  }

  const [rules, locationFees, locations] = await Promise.all([
    db.pricingRule.findMany({ where: { isActive: true } }),
    resolveLocationFees(pickupId, dropoffId),
    db.location.findMany({
      where: {
        id: {
          in: [pickupId, dropoffId].filter((id): id is string => Boolean(id)),
        },
      },
      select: { id: true, name: true },
    }),
  ]);

  const quote = buildQuote(vehicle, start, end, {
    rules,
    locationFees,
    graceMinutes: settings.reservation.graceMinutes,
  });

  /** L'adresse libre, sinon le nom du lieu enregistré. */
  const labelFor = (id: string | null, text: string | null) =>
    text ?? locations.find((location) => location.id === id)?.name ?? null;

  try {
    const reservation = await db.$transaction(async (tx) => {
      // Dernier contrôle DANS la transaction : la période a pu être prise
      // pendant que le client remplissait le formulaire.
      const conflicts = await findConflicts(vehicle.id, start, end);
      if (conflicts.length > 0) {
        throw new ReservationConflictError();
      }

      const customer = await upsertCustomer(tx, data);
      const reference = await nextReservationReference(tx, new Date());

      return tx.reservation.create({
        data: {
          reference,
          vehicleId: vehicle.id,
          customerId: customer.id,
          startAt: start,
          endAt: end,
          pickupLocationId: pickupId,
          dropoffLocationId: dropoffId,
          pickupLocationLabel: labelFor(pickupId, pickupText),
          dropoffLocationLabel: labelFor(dropoffId, dropoffText),
          days: quote.days,
          dailyRate: quote.dailyRate,
          subtotal: quote.subtotal,
          extraFees: quote.extraFees,
          discount: quote.discount,
          totalAmount: quote.total,
          priceBreakdown: quote.lines as never,
          status: "PENDING",
          paymentStatus: "UNPAID",
          source: "WEBSITE",
          customerComment: data.comment || null,
        },
        select: {
          id: true,
          reference: true,
          customerId: true,
          startAt: true,
          endAt: true,
          days: true,
          totalAmount: true,
          pickupLocationLabel: true,
          dropoffLocationLabel: true,
          customerComment: true,
          customer: {
            select: { firstName: true, lastName: true, phone: true, email: true },
          },
        },
      });
    });

    /*
     * Les fichiers sont écrits APRÈS la transaction : inutile de laisser des
     * pièces d'identité sur le disque si la période vient d'être prise par
     * quelqu'un d'autre et que la réservation est refusée.
     */
    const storedDocuments = await storeIdentityDocuments({
      customerId: reservation.customerId,
      reservationId: reservation.id,
      documents,
      source: "site",
    });

    // --- Effets de bord hors transaction : ils ne doivent jamais annuler
    //     une réservation valide s'ils échouent. ---
    const vehicleLabel = `${vehicle.brand} ${vehicle.model}`;
    const emailData = {
      reference: reservation.reference,
      customerName: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
      customerPhone: reservation.customer.phone,
      customerEmail: reservation.customer.email,
      vehicleLabel,
      startAt: reservation.startAt,
      endAt: reservation.endAt,
      days: reservation.days,
      totalAmount: reservation.totalAmount,
      pickupLocation: reservation.pickupLocationLabel,
      dropoffLocation: reservation.dropoffLocationLabel,
      comment: reservation.customerComment,
    };

    await Promise.allSettled([
      createNotification({
        type: NotificationType.NEW_RESERVATION,
        severity: NotificationSeverity.INFO,
        title: `Nouvelle demande ${reservation.reference} — ${vehicleLabel}`,
        message:
          `${emailData.customerName} · ${reservation.days} jour(s) · ${reservation.customer.phone}` +
          (storedDocuments > 0
            ? ` · ${storedDocuments} pièce(s) justificative(s) reçue(s)`
            : ""),
        link: `/admin/reservations/${reservation.id}`,
        entityType: "Reservation",
        entityId: reservation.id,
        dedupeKey: `new:${reservation.id}`,
      }),
      sendMail({
        to: process.env.EMAIL_AGENCY_INBOX ?? "",
        replyTo: reservation.customer.email ?? undefined,
        ...newReservationForAgency(emailData),
      }),
      reservation.customer.email
        ? sendMail({
            to: reservation.customer.email,
            ...reservationReceivedForCustomer(emailData),
          })
        : Promise.resolve(null),
    ]);

    return {
      ok: true,
      reference: reservation.reference,
      token: signReference(reservation.reference),
    };
  } catch (error) {
    if (error instanceof ReservationConflictError || isOverlapViolation(error)) {
      return {
        ok: false,
        error:
          "Ce véhicule vient d'être réservé sur ces dates. Choisissez d'autres dates ou un autre véhicule.",
      };
    }
    console.error("[reservation] création impossible", error);
    return {
      ok: false,
      error:
        "Une erreur est survenue lors de l'enregistrement. Merci de réessayer ou de nous appeler.",
    };
  }
}

class ReservationConflictError extends Error {}

/** Violation de la contrainte d'exclusion PostgreSQL (double réservation). */
function isOverlapViolation(error: unknown): boolean {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "";
  return (
    message.includes("reservation_no_overlap") ||
    message.includes("23P01") // exclusion_violation
  );
}

/**
 * Un client qui revient est reconnu à son téléphone (ou son email) : on
 * enrichit sa fiche au lieu de créer un doublon dans le fichier clients.
 */
async function upsertCustomer(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  data: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    cin?: string;
    licenseNumber?: string;
    country?: string;
    city?: string;
    address?: string;
  },
) {
  const phone = data.phone.replace(/\s+/g, " ").trim();
  const existing = await tx.customer.findFirst({
    where: {
      OR: [
        { phone },
        ...(data.email ? [{ email: data.email.toLowerCase() }] : []),
      ],
    },
    select: { id: true },
  });

  const payload = {
    firstName: data.firstName,
    lastName: data.lastName,
    phone,
    email: data.email ? data.email.toLowerCase() : null,
    cin: data.cin || null,
    licenseNumber: data.licenseNumber || null,
    country: data.country || "Maroc",
    city: data.city || null,
    address: data.address || null,
  };

  if (existing) {
    return tx.customer.update({
      where: { id: existing.id },
      data: payload,
      select: { id: true },
    });
  }
  return tx.customer.create({ data: payload, select: { id: true } });
}

async function resolveLocationFees(
  pickupId?: string | null,
  dropoffId?: string | null,
): Promise<{ label: string; amount: number }[]> {
  const ids = [pickupId, dropoffId].filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  const locations = await db.location.findMany({
    where: { id: { in: ids }, isActive: true },
    select: { id: true, name: true, extraFee: true },
  });

  const fees: { label: string; amount: number }[] = [];
  const pickup = locations.find((location) => location.id === pickupId);
  const dropoff = locations.find((location) => location.id === dropoffId);

  if (pickup?.extraFee) {
    fees.push({ label: `Prise en charge — ${pickup.name}`, amount: pickup.extraFee });
  }
  if (dropoff?.extraFee && dropoffId !== pickupId) {
    fees.push({ label: `Restitution — ${dropoff.name}`, amount: dropoff.extraFee });
  }
  return fees;
}
