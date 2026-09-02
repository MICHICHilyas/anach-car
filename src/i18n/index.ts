import { fr, type Dictionary } from "./dictionaries/fr";
import { en } from "./dictionaries/en";
import { ar } from "./dictionaries/ar";
import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "./config";

const DICTIONARIES: Record<Locale, Dictionary> = { fr, en, ar };

/**
 * Les trois dictionnaires sont légers (quelques kilo-octets) : les importer
 * statiquement évite un aller-retour asynchrone à chaque rendu de page.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export function intlLocale(locale: Locale): string {
  return LOCALE_META[locale].intl;
}

/** Interpole « {count} véhicule(s) » -> « 8 véhicule(s) ». */
export function interpolate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export type { Dictionary };
export * from "./config";
