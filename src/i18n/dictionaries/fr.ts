/**
 * Dictionnaire français — langue de référence.
 * Les fichiers en.ts et ar.ts sont typés d'après celui-ci : oublier une clé
 * lors d'une traduction devient une erreur de compilation.
 */
export const fr = {
  meta: {
    siteName: "Anach Car",
    tagline: "Location de voitures à Dcheira - Inezgane, Agadir",
    description:
      "Location de voitures à Agadir, Inezgane et Dcheira. Véhicules récents et entretenus, tarifs clairs, réservation en ligne en quelques minutes.",
  },
  nav: {
    home: "Accueil",
    vehicles: "Nos véhicules",
    about: "À propos",
    contact: "Contact",
    book: "Réserver",
    menu: "Menu",
    language: "Langue",
  },
  common: {
    from: "Du",
    to: "au",
    day: "jour",
    days: "jours",
    perDay: "/ jour",
    search: "Rechercher",
    filter: "Filtrer",
    filters: "Filtres",
    reset: "Réinitialiser",
    loading: "Chargement…",
    seeDetails: "Voir les détails",
    book: "Réserver",
    viewAll: "Voir tous les véhicules",
    phone: "Téléphone",
    mobile: "Mobile",
    email: "Email",
    address: "Adresse",
    back: "Retour",
    close: "Fermer",
    required: "obligatoire",
    optional: "facultatif",
    send: "Envoyer",
    yes: "Oui",
    no: "Non",
    whatsapp: "WhatsApp",
    callUs: "Appeler",
    openingHours: "Horaires",
  },
  hero: {
    eyebrow: "Agadir · Inezgane · Dcheira",
    title: "Votre voiture. Votre liberté.",
    subtitle: "Réservez votre voiture simplement avec Anach Car.",
    trust: {
      fleet: "Flotte récente et entretenue",
      transparent: "Tarifs transparents, sans surprise",
      support: "Une équipe joignable 7j/7",
    },
    cta: {
      browse: "Voir les véhicules disponibles",
      bookThis: "Réserver ce véhicule",
    },
    slider: {
      label: "Véhicules à la une",
      previous: "Véhicule précédent",
      next: "Véhicule suivant",
    },
  },
  search: {
    title: "Trouvez votre véhicule",
    pickupDate: "Date de départ",
    pickupTime: "Heure de départ",
    returnDate: "Date de retour",
    returnTime: "Heure de retour",
    pickupLocation: "Lieu de départ",
    returnLocation: "Lieu de retour",
    sameLocation: "Même lieu de restitution",
    otherLocation: "Autre adresse…",
    otherPlaceholder: "Hôtel, quartier, adresse précise…",
    otherNote:
      "Supplément éventuel confirmé par l'agence lors de la validation.",
    submit: "Voir les véhicules disponibles",
    errors: {
      missingDates: "Veuillez indiquer vos dates de départ et de retour.",
      invalidPeriod: "La date de retour doit être postérieure à la date de départ.",
      pastDate: "La date de départ ne peut pas être dans le passé.",
    },
  },
  vehicles: {
    title: "Nos véhicules",
    subtitle:
      "Des citadines économiques aux SUV familiaux, tous nos véhicules sont récents, assurés et révisés avant chaque location.",
    availableCount: "{count} véhicule(s) disponible(s)",
    resultsFor: "Disponibles du {start} au {end}",
    available: "Disponible",
    unavailable: "Indisponible",
    availableForYourDates: "Disponible sur vos dates",
    seats: "places",
    doors: "portes",
    airConditioning: "Climatisation",
    mileage: "Kilométrage",
    year: "Année",
    category: "Catégorie",
    transmission: "Transmission",
    fuel: "Carburant",
    from: "À partir de",
    noResults: "Aucun véhicule ne correspond à votre recherche.",
    noResultsForDates:
      "Nous sommes désolés, aucune voiture n'est disponible pour ces dates.",
    noResultsHint:
      "Essayez d'élargir vos dates ou de modifier vos filtres — notre flotte tourne vite.",
    changeDates: "Modifier mes dates",
    resetFilters: "Réinitialiser les filtres",
    sort: {
      label: "Trier par",
      recommended: "Recommandés",
      priceAsc: "Prix croissant",
      priceDesc: "Prix décroissant",
      recent: "Nouveautés",
    },
    filters: {
      category: "Catégorie",
      transmission: "Transmission",
      fuel: "Carburant",
      seats: "Places minimum",
      maxPrice: "Prix maximum / jour",
      all: "Toutes",
      apply: "Appliquer",
    },
  },
  vehicleDetail: {
    backToList: "Retour aux véhicules",
    specifications: "Caractéristiques",
    features: "Équipements",
    conditions: "Conditions de location",
    description: "Description",
    pricing: "Tarifs",
    dailyRate: "Tarif journalier",
    rate3Days: "3 jours et +",
    weeklyRate: "Semaine (7 j et +)",
    monthlyRate: "Mois (30 j et +)",
    bookThisCar: "Réserver ce véhicule",
    checkAvailability: "Vérifier la disponibilité",
    availableForPeriod: "Disponible pour ces dates",
    notAvailableForPeriod: "Ce véhicule n'est pas disponible sur ces dates",
    unavailablePeriods: "Périodes déjà réservées",
    seeOtherVehicles: "Voir les autres véhicules disponibles",
    askOnWhatsapp: "Demander sur WhatsApp",
    estimatedTotal: "Total estimé",
    similar: "Véhicules similaires",
    conditionsList: {
      age: "Âge minimum : 21 ans",
      license: "Permis de conduire de plus de 2 ans",
      documents: "CIN ou passeport en cours de validité",
      fuel: "Carburant : départ et retour au même niveau",
      mileage: "Kilométrage illimité",
      insurance: "Assurance tous risques incluse",
    },
  },
  booking: {
    title: "Votre réservation",
    subtitle: "Encore une étape : vos informations et c'est envoyé.",
    noAccountNeeded: "Aucun compte n'est nécessaire pour réserver.",
    sections: {
      period: "Dates et lieux",
      personal: "Vos informations",
      documents: "Vos documents",
      summary: "Récapitulatif",
    },
    fields: {
      firstName: "Prénom",
      lastName: "Nom",
      phone: "Téléphone",
      email: "Email",
      cin: "CIN / Passeport",
      licenseNumber: "Numéro de permis de conduire",
      country: "Pays",
      city: "Ville",
      address: "Adresse",
      comment: "Message pour l'agence",
      commentPlaceholder:
        "Vol, horaire d'arrivée, siège bébé, livraison à l'aéroport…",
    },
    documentsHint:
      "Ces pièces sont indispensables pour établir le contrat de location. Elles sont stockées de façon sécurisée et ne sont jamais publiées.",
    docs: {
      cin: "Photo de votre CIN ou passeport",
      license: "Photo de votre permis de conduire",
      formats: "JPG, PNG ou PDF · 10 Mo maximum",
      choose: "Choisir un fichier",
      replace: "Remplacer",
      remove: "Retirer le fichier",
      secure:
        "Vos documents sont chiffrés en transit, conservés hors du site public et accessibles uniquement à l'équipe de l'agence.",
    },
    summary: {
      vehicle: "Véhicule",
      period: "Période",
      duration: "Durée",
      pickup: "Prise en charge",
      dropoff: "Restitution",
      dailyRate: "Tarif appliqué",
      subtotal: "Sous-total",
      extraFees: "Frais additionnels",
      discount: "Remise",
      total: "Total estimé",
      paymentNote:
        "Aucun paiement en ligne : le règlement se fait à l'agence, à la prise du véhicule.",
    },
    terms:
      "J'ai lu et j'accepte les conditions générales de location et la politique de confidentialité.",
    submit: "Envoyer ma demande de réservation",
    submitting: "Envoi en cours…",
    validationTitle: "Veuillez corriger les points suivants",
  },
  confirmation: {
    title: "Votre demande de réservation a bien été envoyée.",
    subtitle:
      "Merci de votre confiance. Notre équipe vérifie la disponibilité et vous recontacte très rapidement.",
    reference: "Numéro de réservation",
    status: "Statut",
    pendingStatus: "En attente de confirmation",
    whatNext: "Et maintenant ?",
    steps: {
      one: "Nous vérifions la disponibilité du véhicule sur vos dates.",
      two: "Nous vous appelons ou vous écrivons pour confirmer.",
      three: "Vous récupérez le véhicule avec votre CIN et votre permis.",
    },
    needHelp: "Une question sur votre réservation ?",
    backHome: "Retour à l'accueil",
    notFound: "Cette réservation est introuvable.",
    notFoundHint:
      "Vérifiez le numéro de réservation ou contactez-nous directement.",
  },
  about: {
    title: "Une agence locale, une exigence de professionnels",
    intro:
      "Anach Car loue des véhicules à Dcheira, Inezgane et dans toute la région d'Agadir. Notre métier tient en une promesse simple : vous remettre une voiture propre, fiable et assurée, au prix annoncé.",
    values: {
      fleetTitle: "Véhicules entretenus",
      fleetText:
        "Vidanges, freins, pneus et visites techniques suivis véhicule par véhicule. Rien ne part en location sans contrôle.",
      simpleTitle: "Réservation simple",
      simpleText:
        "Choisissez vos dates, vérifiez la disponibilité réelle, envoyez votre demande. Nous confirmons rapidement.",
      transparentTitle: "Transparence des prix",
      transparentText:
        "Le tarif affiché est le tarif payé. Les conditions sont annoncées avant la réservation, sans caution à avancer.",
      supportTitle: "Service client",
      supportText:
        "Une équipe locale, joignable par téléphone et WhatsApp, qui connaît la région et vos contraintes.",
    },
    fleetTitle: "Notre flotte",
    fleetText:
      "Citadines économiques, berlines confortables et SUV familiaux : nous adaptons le véhicule à votre déplacement, professionnel ou touristique.",
    ctaTitle: "Un déplacement à organiser ?",
    ctaText: "Consultez les véhicules disponibles ou appelez-nous directement.",
  },
  contact: {
    title: "Contact",
    subtitle:
      "Une question, une demande particulière, une location longue durée ? Écrivez-nous ou appelez-nous, nous répondons vite.",
    formTitle: "Envoyez-nous un message",
    fields: {
      name: "Nom complet",
      phone: "Téléphone",
      email: "Email",
      subject: "Sujet",
      message: "Message",
    },
    submit: "Envoyer le message",
    submitting: "Envoi…",
    success: "Merci, votre message a bien été envoyé. Nous vous répondons rapidement.",
    findUs: "Nous trouver",
    whatsappCta: "Discuter sur WhatsApp",
  },
  trust: {
    title: "Ce qui vous attend",
    fleet: "Véhicules récents et entretenus",
    transparent: "Tarifs transparents, sans frais cachés",
    support: "Assistance 7j/7 par téléphone et WhatsApp",
    fast: "Réservation en quelques minutes",
    local: "Agence locale à Agadir - Inezgane",
  },
  testimonials: {
    eyebrow: "Votre satisfaction est notre priorité",
    title: "Ce que nos clients disent",
    subtitle:
      "Des touristes de passage aux professionnels de la région, voici les retours de celles et ceux qui nous ont fait confiance.",
    basedOn: "sur {count} avis",
    outOf: "sur 5",
    verified: "Client vérifié",
  },
  footer: {
    about:
      "Location de voitures à Dcheira - Inezgane. Véhicules récents, entretenus et assurés, pour vos déplacements dans toute la région d'Agadir.",
    navigation: "Navigation",
    legal: "Informations légales",
    contact: "Contact",
    rights: "Tous droits réservés.",
    legalNotice: "Mentions légales",
    privacy: "Politique de confidentialité",
    terms: "Conditions générales de location",
    cancellation: "Politique d'annulation",
    adminAccess: "Espace agence",
  },
  errors: {
    generic: "Une erreur est survenue. Merci de réessayer.",
    notFound: "Page introuvable",
    notFoundText: "La page que vous cherchez n'existe pas ou a été déplacée.",
    backHome: "Retour à l'accueil",
    vehicleUnavailable:
      "Ce véhicule vient d'être réservé sur ces dates. Choisissez d'autres dates ou un autre véhicule.",
  },
} as const;

/**
 * Élargit les types littéraux (`"Accueil"`) en `string` : les autres langues
 * gardent ainsi exactement les mêmes clés, avec des valeurs différentes.
 * Une clé oubliée dans en.ts ou ar.ts devient une erreur de compilation.
 */
type Translated<T> = T extends string
  ? string
  : { [K in keyof T]: Translated<T[K]> };

export type Dictionary = Translated<typeof fr>;
