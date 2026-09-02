import type { VehicleCategory } from "@/generated/prisma/enums";

/**
 * Visuels du Hero.
 *
 * Règle de résolution (voir `resolveHeroImage`) :
 *
 *   1. la photo du véhicule si l'agence en a téléversé une → la vraie voiture
 *      s'affiche automatiquement dans le Hero ;
 *   2. sinon, le visuel de catégorie ci-dessous.
 *
 * Les visuels de catégorie sont des IMAGES DE SUBSTITUTION : ce ne sont pas
 * les véhicules de l'agence. Téléversez les vraies photos depuis
 * /admin/vehicules/[id] pour qu'elles prennent leur place — aucune
 * modification de code n'est nécessaire.
 *
 * Pour remplacer un visuel de catégorie, déposez un fichier de même nom dans
 * public/images/hero/ (format paysage 16:9, 1600 px de large minimum,
 * voiture à droite du cadre pour laisser respirer le texte à gauche).
 */
const HERO_BY_CATEGORY: Record<VehicleCategory, string> = {
  ECONOMIQUE: "/images/hero/economique.webp",
  COMPACTE: "/images/hero/compacte.webp",
  BERLINE: "/images/hero/berline.webp",
  SUV: "/images/hero/suv.webp",
  MONOSPACE: "/images/hero/suv.webp",
  UTILITAIRE: "/images/hero/berline.webp",
  LUXE: "/images/hero/berline.webp",
};

/** Chemins des illustrations du catalogue : trop petites pour un Hero. */
const CATALOG_PLACEHOLDER = "/images/vehicles/";

export function resolveHeroImage(vehicle: {
  category: VehicleCategory;
  images: { url: string }[];
}): { src: string; isRealPhoto: boolean } {
  const uploaded = vehicle.images.find(
    (image) => !image.url.startsWith(CATALOG_PLACEHOLDER),
  );

  if (uploaded) return { src: uploaded.url, isRealPhoto: true };
  return { src: HERO_BY_CATEGORY[vehicle.category], isRealPhoto: false };
}

/**
 * Repli par type de carrosserie, du plus proche au plus éloigné.
 *
 * Deux véhicules d'une même catégorie recevraient sinon le même visuel, ce
 * qui donne l'impression d'un carrousel bloqué. On cherche donc une image
 * encore libre — mais uniquement parmi des carrosseries comparables :
 * afficher un SUV sous le nom d'une citadine serait une erreur bien plus
 * visible qu'une photo répétée. Si toutes sont prises, on répète.
 *
 * Téléverser les vraies photos des véhicules fait disparaître le sujet.
 */
const FALLBACK_CHAIN: Record<VehicleCategory, string[]> = {
  ECONOMIQUE: ["economique", "compacte"],
  COMPACTE: ["compacte", "economique"],
  BERLINE: ["berline", "compacte"],
  SUV: ["suv", "berline"],
  MONOSPACE: ["suv", "berline"],
  UTILITAIRE: ["berline", "suv"],
  LUXE: ["berline", "suv"],
};

const heroFile = (name: string) => `/images/hero/${name}.webp`;

/** Attribue un visuel à chaque véhicule du Hero, en limitant les répétitions. */
export function assignHeroImages<
  T extends { category: VehicleCategory; images: { url: string }[] },
>(vehicles: T[]): (T & { heroImage: string; heroIsRealPhoto: boolean })[] {
  const used = new Set<string>();

  return vehicles.map((vehicle) => {
    const { src, isRealPhoto } = resolveHeroImage(vehicle);

    if (isRealPhoto) {
      used.add(src);
      return { ...vehicle, heroImage: src, heroIsRealPhoto: true };
    }

    const chain = FALLBACK_CHAIN[vehicle.category].map(heroFile);
    const chosen = chain.find((file) => !used.has(file)) ?? chain[0] ?? src;

    used.add(chosen);
    return { ...vehicle, heroImage: chosen, heroIsRealPhoto: false };
  });
}

/** Durée d'affichage d'un véhicule, en millisecondes. */
export const HERO_SLIDE_DURATION = 6500;

/** Nombre de véhicules présentés dans le Hero. */
export const HERO_SLIDE_COUNT = 4;
