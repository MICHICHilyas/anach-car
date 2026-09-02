import { localToUtc, toLocalDateInput, toLocalTimeInput } from "@/lib/dates";

/**
 * Paramètres de recherche partagés entre le serveur (pages catalogue et
 * réservation) et le client (moteur de recherche). Ce module ne porte pas la
 * directive "use client" : il est donc importable des deux côtés.
 */

/**
 * Valeur du menu déroulant signalant une adresse saisie librement.
 *
 * Les lieux enregistrés portent un supplément tarifaire calculé
 * automatiquement. Une adresse libre n'en a pas : l'agence confirme le
 * supplément éventuel à la validation de la demande.
 */
export const CUSTOM_LOCATION = "__autre__";

export type SearchValues = {
  start: string;
  startTime: string;
  end: string;
  endTime: string;
  pickupId: string;
  dropoffId: string;
  /** Adresse libre, utilisée quand l'identifiant vaut CUSTOM_LOCATION. */
  pickupText: string;
  dropoffText: string;
  sameLocation: boolean;
};

export function todayInput(): string {
  return toLocalDateInput(new Date());
}

export function offsetDateInput(days: number): string {
  return toLocalDateInput(new Date(Date.now() + days * 86400000));
}

/** Valeurs par défaut du moteur de recherche : départ demain, retour dans 4 jours. */
export function defaultSearchValues(): SearchValues {
  return {
    start: offsetDateInput(1),
    startTime: "10:00",
    end: offsetDateInput(4),
    endTime: "10:00",
    pickupId: "",
    dropoffId: "",
    pickupText: "",
    dropoffText: "",
    sameLocation: true,
  };
}

export type ParsedPeriod = {
  start: Date;
  end: Date;
  raw: {
    start: string;
    startTime: string;
    end: string;
    endTime: string;
  };
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

/**
 * Lit une période depuis les paramètres d'URL et la convertit en instants UTC.
 * Renvoie null si les dates sont absentes ou mal formées — l'appelant affiche
 * alors le catalogue complet plutôt qu'une erreur.
 */
export function parsePeriodFromParams(
  params: Record<string, string | string[] | undefined>,
): ParsedPeriod | null {
  const get = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const start = get("start");
  const end = get("end");
  if (!start || !end || !DATE_PATTERN.test(start) || !DATE_PATTERN.test(end)) {
    return null;
  }

  const startTime = normalizeTime(get("startTime"));
  const endTime = normalizeTime(get("endTime"));

  try {
    const startAt = localToUtc(start, startTime);
    const endAt = localToUtc(end, endTime);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return null;
    return {
      start: startAt,
      end: endAt,
      raw: { start, startTime, end, endTime },
    };
  } catch {
    return null;
  }
}

function normalizeTime(value: string | undefined): string {
  return value && TIME_PATTERN.test(value) ? value : "10:00";
}

/** Reconstruit la chaîne de requête à propager d'une page à l'autre. */
export function periodQueryString(
  period: ParsedPeriod | null,
  extra: Record<string, string | undefined> = {},
): string {
  const params = new URLSearchParams();
  if (period) {
    params.set("start", period.raw.start);
    params.set("startTime", period.raw.startTime);
    params.set("end", period.raw.end);
    params.set("endTime", period.raw.endTime);
  }
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

/** Convertit une période en valeurs de formulaire (pré-remplissage). */
export function periodToFormValues(period: ParsedPeriod): Partial<SearchValues> {
  return {
    start: period.raw.start,
    startTime: period.raw.startTime,
    end: period.raw.end,
    endTime: period.raw.endTime,
  };
}

export { toLocalDateInput, toLocalTimeInput };
