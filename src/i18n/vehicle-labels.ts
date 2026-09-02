import type {
  FuelType,
  Transmission,
  VehicleCategory,
} from "@/generated/prisma/enums";
import type { Locale } from "./config";

/**
 * Libellés techniques des véhicules, traduits.
 *
 * `src/lib/labels.ts` conserve les libellés français : ils servent au
 * dashboard, qui n'existe qu'en français. Le site public, lui, doit afficher
 * « Automatique / Automatic / أوتوماتيكية » selon la langue choisie — sinon
 * une fiche arabe se retrouve avec « Manuelle · Diesel » en plein milieu.
 */
const TRANSMISSION: Record<Locale, Record<Transmission, string>> = {
  fr: { MANUAL: "Manuelle", AUTOMATIC: "Automatique" },
  en: { MANUAL: "Manual", AUTOMATIC: "Automatic" },
  ar: { MANUAL: "عادية", AUTOMATIC: "أوتوماتيكية" },
};

const FUEL: Record<Locale, Record<FuelType, string>> = {
  fr: {
    DIESEL: "Diesel",
    ESSENCE: "Essence",
    HYBRIDE: "Hybride",
    ELECTRIQUE: "Électrique",
    GPL: "GPL",
  },
  en: {
    DIESEL: "Diesel",
    ESSENCE: "Petrol",
    HYBRIDE: "Hybrid",
    ELECTRIQUE: "Electric",
    GPL: "LPG",
  },
  ar: {
    DIESEL: "ديزل",
    ESSENCE: "بنزين",
    HYBRIDE: "هجينة",
    ELECTRIQUE: "كهربائية",
    GPL: "غاز",
  },
};

const CATEGORY: Record<Locale, Record<VehicleCategory, string>> = {
  fr: {
    ECONOMIQUE: "Économique",
    COMPACTE: "Compacte",
    BERLINE: "Berline",
    SUV: "SUV / 4x4",
    MONOSPACE: "Monospace",
    UTILITAIRE: "Utilitaire",
    LUXE: "Luxe",
  },
  en: {
    ECONOMIQUE: "Economy",
    COMPACTE: "Compact",
    BERLINE: "Saloon",
    SUV: "SUV / 4x4",
    MONOSPACE: "People carrier",
    UTILITAIRE: "Van",
    LUXE: "Luxury",
  },
  ar: {
    ECONOMIQUE: "اقتصادية",
    COMPACTE: "مدمجة",
    BERLINE: "سيارة صالون",
    SUV: "دفع رباعي",
    MONOSPACE: "عائلية",
    UTILITAIRE: "نفعية",
    LUXE: "فاخرة",
  },
};

/** Jeu de libellés pour une langue donnée. */
export function vehicleLabels(locale: Locale) {
  return {
    transmission: (value: Transmission) => TRANSMISSION[locale][value],
    fuel: (value: FuelType) => FUEL[locale][value],
    category: (value: VehicleCategory) => CATEGORY[locale][value],
  };
}
