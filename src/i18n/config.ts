export const LOCALES = ["fr", "en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

export const LOCALE_META: Record<
  Locale,
  { label: string; nativeLabel: string; dir: "ltr" | "rtl"; intl: string }
> = {
  fr: { label: "Français", nativeLabel: "Français", dir: "ltr", intl: "fr-MA" },
  en: { label: "Anglais", nativeLabel: "English", dir: "ltr", intl: "en-GB" },
  ar: { label: "Arabe", nativeLabel: "العربية", dir: "rtl", intl: "ar-MA" },
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return LOCALE_META[locale].dir;
}
