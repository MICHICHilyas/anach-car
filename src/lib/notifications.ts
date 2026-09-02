import "server-only";
import { db } from "@/lib/db";
import {
  MaintenanceStatus,
  NotificationSeverity,
  NotificationType,
  ReservationStatus,
} from "@/generated/prisma/enums";
import { getSettings } from "@/lib/settings";
import { addDays, formatDateShort, toLocalDateInput } from "@/lib/dates";

/**
 * Centre de notifications de l'agence.
 *
 * Les alertes ne sont pas de simples calculs d'affichage : elles sont
 * persistées, ce qui permet de les marquer comme lues et de garder une trace.
 * `dedupeKey` rend la génération idempotente — recalculer les alertes dix
 * fois par jour ne crée pas dix fois la même ligne.
 */

export type NotificationInput = {
  type: NotificationType;
  severity?: NotificationSeverity;
  title: string;
  message?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  dedupeKey?: string;
};

export async function createNotification(input: NotificationInput) {
  const data = {
    type: input.type,
    severity: input.severity ?? NotificationSeverity.INFO,
    title: input.title,
    message: input.message ?? null,
    link: input.link ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    dedupeKey: input.dedupeKey ?? null,
  };

  if (!input.dedupeKey) {
    return db.notification.create({ data });
  }

  return db.notification.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: data,
    update: { title: data.title, message: data.message },
  });
}

export async function getUnreadCount(): Promise<number> {
  return db.notification.count({ where: { isRead: false } });
}

export async function markNotificationRead(id: string, userId: string) {
  return db.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date(), readById: userId },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return db.notification.updateMany({
    where: { isRead: false },
    data: { isRead: true, readAt: new Date(), readById: userId },
  });
}

/**
 * Recalcule les alertes automatiques (vidanges, assurances, visites
 * techniques, départs et retours imminents, documents expirants).
 *
 * Appelée au chargement du dashboard : l'agence n'a aucun cron à installer.
 * En production, la même fonction peut être branchée sur une tâche planifiée.
 */
export async function refreshAlerts(): Promise<{ created: number }> {
  const settings = await getSettings();
  const now = new Date();
  const alerts: NotificationInput[] = [];

  // ---------- Vidanges ----------
  const vehicles = await db.vehicle.findMany({
    where: { archivedAt: null, nextOilChangeMileage: { not: null } },
    select: {
      id: true,
      brand: true,
      model: true,
      plate: true,
      mileage: true,
      nextOilChangeMileage: true,
      insuranceExpiry: true,
      technicalInspectionExpiry: true,
    },
  });

  for (const vehicle of vehicles) {
    const label = `${vehicle.brand} ${vehicle.model} (${vehicle.plate})`;
    const next = vehicle.nextOilChangeMileage!;
    const remaining = next - vehicle.mileage;

    if (remaining <= 0) {
      alerts.push({
        type: NotificationType.MAINTENANCE_OVERDUE,
        severity: NotificationSeverity.DANGER,
        title: `${label} — vidange dépassée`,
        message: `Vidange prévue à ${next.toLocaleString("fr-MA")} km, le véhicule affiche ${vehicle.mileage.toLocaleString("fr-MA")} km (${Math.abs(remaining).toLocaleString("fr-MA")} km de retard).`,
        link: `/admin/vehicules/${vehicle.id}`,
        entityType: "Vehicle",
        entityId: vehicle.id,
        dedupeKey: `oil-overdue:${vehicle.id}:${next}`,
      });
    } else if (remaining <= settings.maintenance.oilChangeAlertKm) {
      alerts.push({
        type: NotificationType.MAINTENANCE_DUE,
        severity: NotificationSeverity.WARNING,
        title: `${label} — vidange dans ${remaining.toLocaleString("fr-MA")} km`,
        message: `Prochaine vidange à ${next.toLocaleString("fr-MA")} km.`,
        link: `/admin/vehicules/${vehicle.id}`,
        entityType: "Vehicle",
        entityId: vehicle.id,
        dedupeKey: `oil-due:${vehicle.id}:${next}`,
      });
    }

    // ---------- Assurance ----------
    if (vehicle.insuranceExpiry) {
      const days = daysUntil(vehicle.insuranceExpiry, now);
      if (days <= settings.maintenance.insuranceAlertDays) {
        alerts.push({
          type: NotificationType.INSURANCE_EXPIRING,
          severity: days < 0 ? NotificationSeverity.DANGER : NotificationSeverity.WARNING,
          title:
            days < 0
              ? `${label} — assurance expirée`
              : `${label} — assurance expire dans ${days} jour${days > 1 ? "s" : ""}`,
          message: `Échéance : ${formatDateShort(vehicle.insuranceExpiry)}.`,
          link: `/admin/vehicules/${vehicle.id}`,
          entityType: "Vehicle",
          entityId: vehicle.id,
          dedupeKey: `insurance:${vehicle.id}:${toLocalDateInput(vehicle.insuranceExpiry)}`,
        });
      }
    }

    // ---------- Visite technique ----------
    if (vehicle.technicalInspectionExpiry) {
      const days = daysUntil(vehicle.technicalInspectionExpiry, now);
      if (days <= settings.maintenance.inspectionAlertDays) {
        alerts.push({
          type: NotificationType.INSPECTION_EXPIRING,
          severity: days < 0 ? NotificationSeverity.DANGER : NotificationSeverity.WARNING,
          title:
            days < 0
              ? `${label} — visite technique expirée`
              : `${label} — visite technique expire dans ${days} jour${days > 1 ? "s" : ""}`,
          message: `Échéance : ${formatDateShort(vehicle.technicalInspectionExpiry)}.`,
          link: `/admin/vehicules/${vehicle.id}`,
          entityType: "Vehicle",
          entityId: vehicle.id,
          dedupeKey: `inspection:${vehicle.id}:${toLocalDateInput(vehicle.technicalInspectionExpiry)}`,
        });
      }
    }
  }

  // ---------- Départs imminents (dans les 48 h) ----------
  const upcoming = await db.reservation.findMany({
    where: {
      status: ReservationStatus.CONFIRMED,
      startAt: { gte: now, lte: addDays(now, 2) },
    },
    select: {
      id: true,
      reference: true,
      startAt: true,
      customer: { select: { firstName: true, lastName: true } },
      vehicle: { select: { brand: true, model: true } },
    },
  });

  for (const reservation of upcoming) {
    alerts.push({
      type: NotificationType.RENTAL_STARTING,
      severity: NotificationSeverity.INFO,
      title: `Départ le ${formatDateShort(reservation.startAt)} — ${reservation.vehicle.brand} ${reservation.vehicle.model}`,
      message: `${reservation.customer.firstName} ${reservation.customer.lastName} · réservation ${reservation.reference}.`,
      link: `/admin/reservations/${reservation.id}`,
      entityType: "Reservation",
      entityId: reservation.id,
      dedupeKey: `start:${reservation.id}`,
    });
  }

  // ---------- Retours prévus et retards ----------
  const running = await db.reservation.findMany({
    where: { status: ReservationStatus.ACTIVE, endAt: { lte: addDays(now, 1) } },
    select: {
      id: true,
      reference: true,
      endAt: true,
      customer: { select: { firstName: true, lastName: true } },
      vehicle: { select: { brand: true, model: true } },
    },
  });

  for (const reservation of running) {
    const late = reservation.endAt < now;
    alerts.push({
      type: late ? NotificationType.RENTAL_OVERDUE : NotificationType.RENTAL_RETURN_DUE,
      severity: late ? NotificationSeverity.DANGER : NotificationSeverity.WARNING,
      title: late
        ? `Retour en retard — ${reservation.vehicle.brand} ${reservation.vehicle.model}`
        : `Retour prévu le ${formatDateShort(reservation.endAt)} — ${reservation.vehicle.brand} ${reservation.vehicle.model}`,
      message: `${reservation.customer.firstName} ${reservation.customer.lastName} · réservation ${reservation.reference}.`,
      link: `/admin/locations`,
      entityType: "Reservation",
      entityId: reservation.id,
      dedupeKey: `${late ? "overdue" : "return"}:${reservation.id}`,
    });
  }

  // ---------- Documents clients bientôt expirés ----------
  const documents = await db.document.findMany({
    where: {
      expiresAt: {
        not: null,
        lte: addDays(now, settings.maintenance.documentAlertDays),
      },
    },
    select: {
      id: true,
      title: true,
      fileName: true,
      expiresAt: true,
      customerId: true,
    },
    take: 50,
  });

  for (const document of documents) {
    alerts.push({
      type: NotificationType.DOCUMENT_EXPIRING,
      severity: NotificationSeverity.WARNING,
      title: `Document bientôt expiré — ${document.title ?? document.fileName}`,
      message: `Échéance : ${formatDateShort(document.expiresAt!)}.`,
      link: document.customerId
        ? `/admin/clients/${document.customerId}`
        : "/admin/documents",
      entityType: "Document",
      entityId: document.id,
      dedupeKey: `document:${document.id}:${toLocalDateInput(document.expiresAt!)}`,
    });
  }

  for (const alert of alerts) {
    await createNotification(alert).catch((error) =>
      console.error("[notifications] création impossible", error),
    );
  }

  return { created: alerts.length };
}

function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / (24 * 3600 * 1000));
}

/** Immobilisations garage en cours (utilisé par le tableau de bord). */
export async function getActiveMaintenanceCount(): Promise<number> {
  return db.maintenance.count({
    where: {
      status: { in: [MaintenanceStatus.PLANNED, MaintenanceStatus.IN_PROGRESS] },
    },
  });
}
