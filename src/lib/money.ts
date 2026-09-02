/**
 * Toutes les sommes transitent en CENTIMES de dirham (entiers).
 * On évite ainsi les erreurs d'arrondi des flottants sur les additions de
 * devis et d'acomptes.
 */

export const CURRENCY = "MAD";
export const CURRENCY_LABEL = "DH";

/** 250,50 DH -> 25050 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** 25050 -> 250.5 */
export function toUnits(cents: number): number {
  return cents / 100;
}

/**
 * Formate un montant pour l'affichage : 25000 -> « 250 DH ».
 * Les centimes ne sont affichés que s'ils existent réellement.
 */
export function formatMoney(
  cents: number,
  options: { locale?: string; withCurrency?: boolean } = {},
): string {
  const { locale = "fr-MA", withCurrency = true } = options;
  const hasCents = cents % 100 !== 0;

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(toUnits(cents));

  return withCurrency ? `${formatted} ${CURRENCY_LABEL}` : formatted;
}

/** « 250 DH / jour » */
export function formatDailyRate(cents: number, perDayLabel = "/ jour"): string {
  return `${formatMoney(cents)} ${perDayLabel}`;
}
