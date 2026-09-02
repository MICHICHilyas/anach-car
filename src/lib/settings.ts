import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { AGENCY } from "@/config/agency";

/**
 * Paramètres modifiables par l'agence depuis /admin/parametres.
 *
 * Aucune de ces règles n'est codée en dur dans les composants : le gérant peut
 * changer le seuil d'alerte vidange ou la durée minimale de location sans
 * qu'un développeur intervienne.
 */
export type AppSettings = {
  agency: {
    name: string;
    phone: string;
    mobile: string;
    whatsapp: string;
    email: string;
    address: string;
    openingHours: string;
  };
  reservation: {
    /** Durée minimale facturable, en jours. */
    minRentalDays: number;
    maxRentalDays: number;
    /** Délai minimum entre la demande et le départ, en heures. */
    minAdvanceHours: number;
    /** Tolérance avant de facturer un jour supplémentaire, en minutes. */
    graceMinutes: number;
    cancellationPolicy: string;
    requireDriverLicense: boolean;
    /**
     * Exiger la CIN et le permis dès l'envoi de la demande.
     * Désactivable si l'agence préfère les recueillir au comptoir.
     */
    requireDocumentsAtBooking: boolean;
  };
  maintenance: {
    /** Alerte quand il reste moins de X km avant la vidange. */
    oilChangeAlertKm: number;
    /** Alerte X jours avant l'expiration de l'assurance. */
    insuranceAlertDays: number;
    /** Alerte X jours avant l'expiration de la visite technique. */
    inspectionAlertDays: number;
    /** Alerte X jours avant l'expiration d'un document client. */
    documentAlertDays: number;
  };
  notifications: {
    dashboardEnabled: boolean;
    emailEnabled: boolean;
    whatsappEnabled: boolean;
  };
};

export const DEFAULT_SETTINGS: AppSettings = {
  agency: {
    name: AGENCY.name,
    phone: AGENCY.phone.landline,
    mobile: AGENCY.phone.mobile,
    whatsapp: AGENCY.phone.whatsapp,
    email: AGENCY.email,
    address: AGENCY.address.full,
    openingHours: AGENCY.openingHours
      .map((o) => `${o.days} : ${o.hours}`)
      .join(" · "),
  },
  reservation: {
    minRentalDays: 1,
    maxRentalDays: 90,
    minAdvanceHours: 2,
    graceMinutes: 60,
    cancellationPolicy:
      "Annulation gratuite jusqu'à 48 h avant le début de la location.",
    requireDriverLicense: true,
    requireDocumentsAtBooking: true,
  },
  maintenance: {
    oilChangeAlertKm: 500,
    insuranceAlertDays: 30,
    inspectionAlertDays: 30,
    documentAlertDays: 30,
  },
  notifications: {
    dashboardEnabled: true,
    emailEnabled: true,
    whatsappEnabled: false,
  },
};

const SETTINGS_KEY = "app";

function merge(base: AppSettings, override: unknown): AppSettings {
  if (!override || typeof override !== "object") return base;
  const patch = override as Partial<Record<keyof AppSettings, object>>;
  return {
    agency: { ...base.agency, ...(patch.agency ?? {}) },
    reservation: { ...base.reservation, ...(patch.reservation ?? {}) },
    maintenance: { ...base.maintenance, ...(patch.maintenance ?? {}) },
    notifications: { ...base.notifications, ...(patch.notifications ?? {}) },
  };
}

/**
 * Lit les paramètres. Mémoïsé par requête : dix composants peuvent l'appeler
 * sans déclencher dix requêtes SQL.
 */
export const getSettings = cache(async (): Promise<AppSettings> => {
  try {
    const row = await db.setting.findUnique({ where: { key: SETTINGS_KEY } });
    return merge(DEFAULT_SETTINGS, row?.value);
  } catch {
    // La base peut être indisponible au tout premier démarrage : le site
    // public doit rester affichable avec les valeurs par défaut.
    return DEFAULT_SETTINGS;
  }
});

export async function updateSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const current = await db.setting.findUnique({ where: { key: SETTINGS_KEY } });
  const merged = merge(merge(DEFAULT_SETTINGS, current?.value), patch);
  await db.setting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: merged },
    update: { value: merged },
  });
  return merged;
}
