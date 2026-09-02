import { AGENCY } from "@/config/agency";

export const AGENCY_TIME_ZONE = AGENCY.timeZone;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Décalage du fuseau (en ms) à un instant donné — gère les changements d'heure. */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - date.getTime();
}

/**
 * Convertit une date + heure saisies par l'utilisateur (heure locale du Maroc)
 * en instant UTC destiné à la base.
 *
 * @param date "2026-08-25"
 * @param time "10:00"
 */
export function localToUtc(
  date: string,
  time = "10:00",
  timeZone = AGENCY_TIME_ZONE,
): Date {
  const naive = new Date(`${date}T${normalizeTime(time)}:00.000Z`);
  if (Number.isNaN(naive.getTime())) {
    throw new Error(`Date invalide : ${date} ${time}`);
  }
  const offset = timeZoneOffsetMs(naive, timeZone);
  let result = new Date(naive.getTime() - offset);
  // Second passage : corrige les cas limites de changement d'heure.
  const refined = timeZoneOffsetMs(result, timeZone);
  if (refined !== offset) result = new Date(naive.getTime() - refined);
  return result;
}

function normalizeTime(time: string): string {
  const [h = "10", m = "00"] = time.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

/** "2026-08-25" tel que vu depuis le Maroc. */
export function toLocalDateInput(date: Date, timeZone = AGENCY_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** "10:00" tel que vu depuis le Maroc. */
export function toLocalTimeInput(date: Date, timeZone = AGENCY_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Nombre de jours facturés.
 *
 * Une journée de location = 24 h. Une tolérance (par défaut 60 min) évite de
 * facturer un jour entier pour quelques minutes de retard au retour.
 * 25/08 10h -> 29/08 10h = 4 jours. Minimum facturable : 1 jour.
 */
export function computeRentalDays(
  start: Date,
  end: Date,
  graceMinutes = 60,
): number {
  const duration = end.getTime() - start.getTime();
  if (duration <= 0) return 0;
  const billable = Math.max(0, duration - graceMinutes * 60 * 1000);
  return Math.max(1, Math.ceil(billable / DAY_MS));
}

/** Deux périodes se chevauchent-elles ? (bornes [début, fin[) */
export function periodsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / DAY_MS);
}

export function startOfDayUtc(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Formatage lisible : « 25 août 2026 à 10:00 ». */
export function formatDateTime(date: Date, locale = "fr-MA"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: AGENCY_TIME_ZONE,
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

/** « 25 août 2026 » */
export function formatDate(date: Date, locale = "fr-MA"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: AGENCY_TIME_ZONE,
    dateStyle: "long",
  }).format(date);
}

/** « 25/08/2026 » — compact, pour les tableaux du dashboard. */
export function formatDateShort(date: Date, locale = "fr-MA"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: AGENCY_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatTime(date: Date, locale = "fr-MA"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: AGENCY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
