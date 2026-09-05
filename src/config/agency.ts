/**
 * Source unique de vérité pour l'identité et les coordonnées de l'agence.
 *
 * Rien de ce qui suit ne doit être recopié en dur ailleurs dans le code :
 * pages contact, pied de page, emails, données structurées SEO et liens
 * WhatsApp lisent tous ce fichier. Les valeurs modifiables par le gérant
 * depuis le dashboard vivent dans la table Setting (voir src/lib/settings.ts)
 * et prennent le pas sur ces valeurs par défaut.
 */

export const AGENCY = {
  name: "Anach Car",
  legalName: "Anach Car",
  tagline: "Location de voitures",
  city: "Dcheira - Inezgane",
  region: "Agadir",
  country: "Maroc",
  countryCode: "MA",
  timeZone: "Africa/Casablanca",

  address: {
    street: "N° 9 Rue N° 2302 Derbe ANACH",
    locality: "Dcheira - Inezgane",
    region: "Souss-Massa",
    postalCode: "80650",
    country: "Maroc",
    full: "N° 9 Rue N° 2302 Derbe ANACH, Dcheira - Inezgane, Maroc",
  },

  phone: {
    /** Format affiché */
    landline: "+212 5 28 27 15 16",
    mobile: "+212 6 61 80 58 08",
    /** Format composable (tel:) */
    landlineHref: "+212528271516",
    mobileHref: "+212661805808",
    /** Format WhatsApp (sans +, sans espaces) */
    whatsapp: "212661805808",
  },

  email: "anachcar64@gmail.com",

  /** Coordonnées GPS approximatives de Dcheira - Inezgane. */
  geo: { latitude: 30.3595, longitude: -9.5385 },

  openingHours: [
    { days: "Lundi - Samedi", hours: "08:30 - 20:00" },
    { days: "Dimanche", hours: "09:00 - 13:00" },
  ],

  /**
   * Logo : déposez le fichier fourni par l'agence dans public/brand/.
   * Tant qu'il est absent, le composant <Logo /> affiche la version
   * typographique de secours — aucun faux logo n'est généré.
   */
  /**
   * Déclinaisons du logo officiel, générées par `npm run brand` à partir de
   * brand-assets/logo-anach-car-source.png. Passez `useImage` à false pour
   * revenir à la version typographique de secours.
   */
  logo: {
    useImage: true,
    /** Logo complet, avec la baseline. Pied de page, connexion, contrat. */
    src: "/brand/anach-car-logo.png",
    srcWhite: "/brand/anach-car-logo-white.png",
    width: 401,
    height: 160,
    /** Version sans baseline, pour les en-têtes où la place manque. */
    srcCompact: "/brand/anach-car-logo-compact.png",
    srcCompactWhite: "/brand/anach-car-logo-compact-white.png",
    compactWidth: 520,
    compactHeight: 160,
    /** Pictogramme seul : favicon, réseaux sociaux. */
    mark: "/brand/anach-car-mark.png",
  },

  social: {
    facebook: "",
    instagram: "",
  },
} as const;

/** Lien WhatsApp avec message pré-rempli (encodé). */
export function whatsappLink(
  message?: string,
  number: string = AGENCY.phone.whatsapp,
): string {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * Liens cartographiques. L'adresse est passée en argument par les pages
 * publiques (celle saisie dans /admin/parametres) ; à défaut, celle de la
 * configuration sert de repli.
 */
export function googleMapsLink(address: string = AGENCY.address.full): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address,
  )}`;
}

export function googleMapsEmbedUrl(
  address: string = AGENCY.address.full,
): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}
