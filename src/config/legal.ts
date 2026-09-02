import { AGENCY } from "@/config/agency";

/**
 * Contenu juridique.
 *
 * Rédigé comme une base de travail professionnelle et cohérente avec
 * l'activité de l'agence. Les mentions marquées « À COMPLÉTER » attendent
 * les informations officielles (RC, ICE, IF, patente) ; le gérant ou son
 * conseil peut ensuite ajuster librement ce fichier — aucune de ces chaînes
 * n'est codée en dur dans les pages.
 */

export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDocument = {
  slug: string;
  title: string;
  intro: string;
  updatedAt: string;
  sections: LegalSection[];
};

const TODO = "À COMPLÉTER par l'agence";

export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  "mentions-legales": {
    slug: "mentions-legales",
    title: "Mentions légales",
    intro:
      "Informations relatives à l'éditeur du site et aux conditions de son utilisation.",
    updatedAt: "2026",
    sections: [
      {
        heading: "Éditeur du site",
        paragraphs: [
          `${AGENCY.legalName} — ${AGENCY.tagline}.`,
          `Adresse : ${AGENCY.address.full}.`,
          `Téléphone : ${AGENCY.phone.landline} · Mobile : ${AGENCY.phone.mobile}.`,
          `Email : ${AGENCY.email}.`,
          `Registre de commerce (RC) : ${TODO}. Identifiant commun de l'entreprise (ICE) : ${TODO}. Identifiant fiscal (IF) : ${TODO}. Patente : ${TODO}.`,
        ],
      },
      {
        heading: "Hébergement",
        paragraphs: [
          `Le site est hébergé par ${TODO} (nom, adresse et contact de l'hébergeur).`,
        ],
      },
      {
        heading: "Propriété intellectuelle",
        paragraphs: [
          `L'ensemble des contenus du site (textes, photographies des véhicules, logo, charte graphique) est la propriété de ${AGENCY.legalName}, sauf mention contraire.`,
          "Toute reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable est interdite.",
        ],
      },
      {
        heading: "Responsabilité",
        paragraphs: [
          "Les informations relatives aux véhicules (tarifs, caractéristiques, disponibilité) sont mises à jour en continu depuis notre système de gestion. Une erreur d'affichage ponctuelle ne saurait engager la responsabilité de l'agence : seule la confirmation écrite de la réservation par l'agence fait foi.",
          "Le site peut contenir des liens vers des sites tiers dont le contenu n'engage que leurs éditeurs.",
        ],
      },
      {
        heading: "Droit applicable",
        paragraphs: [
          "Le présent site et son utilisation sont régis par le droit marocain. Tout litige relève de la compétence des tribunaux d'Inezgane-Aït Melloul.",
        ],
      },
    ],
  },

  confidentialite: {
    slug: "confidentialite",
    title: "Politique de confidentialité",
    intro:
      "Comment nous collectons, utilisons et protégeons vos données personnelles.",
    updatedAt: "2026",
    sections: [
      {
        heading: "Responsable du traitement",
        paragraphs: [
          `${AGENCY.legalName}, ${AGENCY.address.full}. Contact : ${AGENCY.email}.`,
          "Le traitement des données personnelles est soumis à la loi n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel, et déclaré auprès de la CNDP (déclaration n° " +
            TODO +
            ").",
        ],
      },
      {
        heading: "Données collectées",
        paragraphs: [
          "Lors d'une demande de réservation : nom, prénom, téléphone, email, numéro de CIN ou de passeport, numéro de permis de conduire, pays, ville et adresse.",
          "Une copie de votre pièce d'identité (CIN ou passeport) et de votre permis de conduire vous est demandée au moment de la réservation. Ces images sont nécessaires à l'établissement du contrat de location, à nos obligations d'assurance et à la constitution de votre dossier client.",
          "Lors de la signature du contrat : kilométrage et état du véhicule au départ et au retour.",
          "Aucune donnée bancaire n'est collectée sur ce site : le règlement s'effectue à l'agence.",
        ],
      },
      {
        heading: "Finalités",
        paragraphs: [
          "Traiter votre demande de réservation et vous recontacter.",
          "Établir le contrat de location et respecter nos obligations légales, comptables et d'assurance.",
          "Assurer le suivi de la relation client et la gestion des litiges éventuels.",
        ],
      },
      {
        heading: "Durée de conservation",
        paragraphs: [
          "Les dossiers de location sont conservés pendant la durée légale de conservation des documents comptables et contractuels.",
          // Le gérant a fait le choix de conserver les pièces justificatives
          // dans le dossier client. La loi 09-08 n'interdit pas cette
          // conservation, mais impose d'en informer la personne concernée et
          // d'en indiquer la finalité : c'est l'objet du paragraphe suivant.
          "Les copies de pièces d'identité (CIN ou passeport) et de permis de conduire sont conservées dans le dossier du client pour toute la durée de la relation commerciale, ainsi qu'au-delà pour les besoins de preuve en cas de litige, de sinistre, de contestation ou de contrôle administratif. Elles ne sont jamais transmises à des tiers ni utilisées à des fins commerciales.",
          "Vous pouvez à tout moment demander la suppression de vos pièces justificatives en contactant l'agence, sous réserve des obligations légales de conservation qui pourraient s'y opposer.",
        ],
      },
      {
        heading: "Sécurité",
        paragraphs: [
          "Les documents d'identité transmis à l'agence ne sont jamais accessibles publiquement : ils sont stockés hors du site public, ne possèdent aucune adresse web devinable, et ne sont consultables que par le personnel autorisé, après authentification. Chaque consultation est journalisée.",
          "Les accès au système de gestion sont nominatifs et journalisés.",
        ],
      },
      {
        heading: "Vos droits",
        paragraphs: [
          `Vous disposez d'un droit d'accès, de rectification, d'opposition et de suppression de vos données. Pour l'exercer, écrivez à ${AGENCY.email} ou présentez-vous à l'agence avec une pièce d'identité.`,
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "Le site utilise uniquement des cookies techniques nécessaires à son fonctionnement : mémorisation de la langue choisie et session de connexion à l'espace agence. Aucun cookie publicitaire ou de traçage tiers n'est déposé.",
        ],
      },
    ],
  },

  "conditions-generales": {
    slug: "conditions-generales",
    title: "Conditions générales de location",
    intro:
      "Les règles qui encadrent la location d'un véhicule auprès de notre agence.",
    updatedAt: "2026",
    sections: [
      {
        heading: "1. Conditions du conducteur",
        paragraphs: [
          "Le conducteur doit être âgé d'au moins 21 ans et titulaire d'un permis de conduire valide depuis plus de 2 ans.",
          "Une pièce d'identité en cours de validité (CIN pour les résidents, passeport pour les visiteurs étrangers) et le permis original sont exigés à la remise du véhicule.",
          "Tout conducteur additionnel doit être déclaré et remplir les mêmes conditions.",
        ],
      },
      {
        heading: "2. Réservation et confirmation",
        paragraphs: [
          "Une demande envoyée depuis le site vaut demande de réservation, non réservation ferme. Elle est confirmée par l'agence après vérification de la disponibilité.",
          "Les tarifs affichés sont exprimés en dirhams (MAD), toutes taxes comprises, par période de 24 heures.",
        ],
      },
      {
        heading: "3. Durée et retard",
        paragraphs: [
          "La journée de location correspond à une période de 24 heures. Une tolérance est appliquée au retour ; au-delà, toute heure entamée peut donner lieu à la facturation d'une journée supplémentaire.",
          "Toute prolongation doit être demandée et validée par l'agence avant la fin de la période en cours.",
        ],
      },
      {
        heading: "4. Carburant et kilométrage",
        paragraphs: [
          "Le véhicule est remis avec un niveau de carburant constaté ; il doit être restitué au même niveau. À défaut, le complément est facturé au prix en vigueur, majoré des frais de service.",
          "Sauf mention contraire, le kilométrage est illimité.",
        ],
      },
      {
        heading: "5. Assurance et responsabilité",
        paragraphs: [
          "Les véhicules sont assurés conformément à la réglementation marocaine. Une franchise reste à la charge du locataire en cas de sinistre responsable.",
          "Ne sont pas couverts : la conduite sous l'emprise de l'alcool ou de stupéfiants, la conduite par une personne non déclarée au contrat, les dommages aux pneus, au bas de caisse et à l'habitacle, ainsi que la circulation sur pistes non carrossables sans accord préalable.",
        ],
      },
      {
        heading: "6. Utilisation du véhicule",
        paragraphs: [
          "Le véhicule ne peut être ni sous-loué, ni utilisé pour du transport rémunéré de personnes ou de marchandises, ni engagé dans une compétition.",
          "La sortie du territoire marocain est interdite sans autorisation écrite préalable de l'agence.",
        ],
      },
      {
        heading: "7. Panne et accident",
        paragraphs: [
          "En cas de panne, le locataire prévient immédiatement l'agence ; aucune réparation ne peut être engagée sans accord préalable.",
          "En cas d'accident, un constat amiable et, le cas échéant, un procès-verbal des autorités sont obligatoires pour la prise en charge par l'assurance.",
        ],
      },
      {
        heading: "8. Litiges",
        paragraphs: [
          "Les présentes conditions sont régies par le droit marocain. À défaut d'accord amiable, tout litige relève des tribunaux d'Inezgane-Aït Melloul.",
        ],
      },
    ],
  },

  annulation: {
    slug: "annulation",
    title: "Politique d'annulation",
    intro: "Les modalités d'annulation et de modification d'une réservation.",
    updatedAt: "2026",
    sections: [
      {
        heading: "Annulation par le client",
        paragraphs: [
          "L'annulation est gratuite jusqu'à 48 heures avant l'heure prévue de prise du véhicule.",
          "Entre 48 heures et le début de la location, l'agence se réserve le droit de retenir tout ou partie de l'acompte versé.",
          "En cas de non-présentation (no-show) sans avoir prévenu l'agence, l'acompte reste acquis à l'agence.",
        ],
      },
      {
        heading: "Modification d'une réservation",
        paragraphs: [
          "Toute modification de dates, de lieu ou de véhicule est possible sous réserve de disponibilité. Elle doit être demandée par téléphone, WhatsApp ou email avant le début de la location.",
          "Une modification peut entraîner un ajustement tarifaire si elle change la durée ou la catégorie du véhicule.",
        ],
      },
      {
        heading: "Annulation par l'agence",
        paragraphs: [
          "En cas d'indisponibilité imprévue du véhicule réservé (accident, immobilisation technique), l'agence propose en priorité un véhicule de catégorie équivalente ou supérieure, sans supplément.",
          "Si aucune solution ne convient au client, les sommes versées sont intégralement remboursées.",
        ],
      },
      {
        heading: "Restitution anticipée",
        paragraphs: [
          "Une restitution avant la date prévue ne donne pas lieu au remboursement des journées non utilisées, sauf accord exprès de l'agence.",
        ],
      },
    ],
  },
};
