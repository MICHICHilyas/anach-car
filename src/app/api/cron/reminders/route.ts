import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { rentalReminderForCustomer } from "@/lib/emails/templates";
import { createNotification, refreshAlerts } from "@/lib/notifications";
import { getSettings } from "@/lib/settings";
import { addDays } from "@/lib/dates";
import {
  NotificationSeverity,
  NotificationType,
  ReservationStatus,
} from "@/generated/prisma/enums";

/**
 * Tâche planifiée : rappels clients et rafraîchissement des alertes.
 *
 * Appelée une fois par jour (cron Vercel, cron système, ou n'importe quel
 * planificateur) :
 *
 *   0 8 * * *  curl -H "Authorization: Bearer $CRON_SECRET" \
 *                   https://www.anachcar.ma/api/cron/reminders
 *
 * Le dashboard recalcule déjà les alertes à chaque ouverture ; cette route
 * sert surtout à envoyer les emails de rappel la veille du départ, ce qu'une
 * page consultée ne peut pas garantir.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const settings = await getSettings();
  const now = new Date();
  const horizon = addDays(now, 1);

  // Locations confirmées qui démarrent dans les 24 heures.
  const upcoming = await db.reservation.findMany({
    where: {
      status: ReservationStatus.CONFIRMED,
      startAt: { gte: now, lte: horizon },
    },
    select: {
      id: true,
      reference: true,
      startAt: true,
      endAt: true,
      days: true,
      totalAmount: true,
      pickupLocationLabel: true,
      dropoffLocationLabel: true,
      customer: {
        select: { firstName: true, lastName: true, phone: true, email: true },
      },
      vehicle: { select: { brand: true, model: true } },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const reservation of upcoming) {
    const dedupeKey = `reminder:${reservation.id}`;

    // Idempotence : la notification fait office de marqueur « déjà envoyé ».
    const already = await db.notification.findUnique({
      where: { dedupeKey },
      select: { id: true },
    });
    if (already) {
      skipped += 1;
      continue;
    }

    if (settings.notifications.emailEnabled && reservation.customer.email) {
      const result = await sendMail({
        to: reservation.customer.email,
        ...rentalReminderForCustomer({
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
        }),
      });
      if (result.sent) sent += 1;
    }

    await createNotification({
      type: NotificationType.RENTAL_STARTING,
      severity: NotificationSeverity.INFO,
      title: `Départ demain — ${reservation.vehicle.brand} ${reservation.vehicle.model}`,
      message: `${reservation.customer.firstName} ${reservation.customer.lastName} · ${reservation.customer.phone} · rappel envoyé`,
      link: `/admin/reservations/${reservation.id}`,
      entityType: "Reservation",
      entityId: reservation.id,
      dedupeKey,
    });
  }

  const alerts = await refreshAlerts();

  return NextResponse.json({
    ranAt: now.toISOString(),
    remindersSent: sent,
    remindersSkipped: skipped,
    alertsRefreshed: alerts.created,
  });
}

/**
 * Deux modes d'authentification :
 *  - `Authorization: Bearer <CRON_SECRET>` (n'importe quel planificateur) ;
 *  - l'en-tête `x-vercel-cron`, posé par les crons Vercel.
 * Sans `CRON_SECRET`, la route est fermée : mieux vaut un rappel manquant
 * qu'un point d'entrée ouvert.
 */
function isAuthorized(request: Request): boolean {
  if (request.headers.get("x-vercel-cron")) return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}
