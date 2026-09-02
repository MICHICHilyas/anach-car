import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import { getDictionary, type Dictionary } from "./index";

/**
 * Langue de la requête courante, telle que déterminée par le middleware.
 * Les pages publiques reçoivent aussi `params.locale` ; cet utilitaire sert
 * aux composants partagés (en-tête, pied de page) qui n'ont pas de params.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const headerList = await headers();
  const value = headerList.get("x-locale") ?? DEFAULT_LOCALE;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

export const getTranslations = cache(async (): Promise<Dictionary> => {
  return getDictionary(await getLocale());
});
