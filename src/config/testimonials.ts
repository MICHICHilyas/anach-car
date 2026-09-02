/**
 * Avis clients affichés sur la page d'accueil.
 *
 * ⚠️ CE SONT DES EXEMPLES, PAS DE VRAIS AVIS.
 *
 * Remplacez-les par les retours réellement reçus (Google, WhatsApp, sur
 * place) avant la mise en ligne. Publier de faux témoignages comme s'ils
 * étaient authentiques est une pratique commerciale trompeuse, sanctionnée
 * par la loi 31-08 sur la protection du consommateur.
 *
 * Pour retirer complètement la section : videz ce tableau, elle disparaît
 * d'elle-même de la page d'accueil.
 *
 * Chaque avis accepte trois traductions ; si `en` ou `ar` manquent, le texte
 * français est utilisé.
 */
export type Testimonial = {
  id: string;
  /** Prénom et initiale du nom : on ne publie pas l'identité complète. */
  author: string;
  /** Ville ou pays d'origine du client. */
  origin: string;
  /** Note sur 5. */
  rating: 1 | 2 | 3 | 4 | 5;
  /** Période de la location, telle qu'affichée sous l'avis. */
  period: string;
  /** Véhicule loué, si vous souhaitez l'indiquer. */
  vehicle?: string;
  /**
   * Avis vérifié : à réserver aux retours dont vous avez la trace
   * (réservation associée, avis Google). Ne cochez pas à la légère.
   */
  verified: boolean;
  quote: { fr: string; en?: string; ar?: string };
};

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "demo-1",
    author: "Ahmed B.",
    origin: "Agadir",
    rating: 5,
    period: "Août 2026",
    vehicle: "Dacia Logan",
    verified: true,
    quote: {
      fr: "Réservation faite le matin, voiture récupérée à midi. Véhicule impeccable et prix exactement celui annoncé sur le site. Rien à redire.",
      en: "Booked in the morning, car picked up at noon. Spotless vehicle and exactly the price shown on the site. Nothing to fault.",
      ar: "حجزت صباحاً واستلمت السيارة عند الزوال. سيارة نظيفة تماماً والثمن هو نفسه المعلن في الموقع. لا ملاحظة لي.",
    },
  },
  {
    id: "demo-2",
    author: "Marie L.",
    origin: "Lyon, France",
    rating: 5,
    period: "Juillet 2026",
    vehicle: "Renault Clio",
    verified: true,
    quote: {
      fr: "Livraison à l'aéroport à l'heure malgré un vol retardé. L'équipe m'a rappelée pour s'adapter. Un vrai service, on sent l'habitude des touristes.",
      en: "Airport delivery on time despite a delayed flight. The team called me back to adapt. Real service — they clearly know how to handle travellers.",
      ar: "التوصيل إلى المطار في الوقت رغم تأخر الرحلة. اتصل بي الفريق للتأقلم مع التغيير. خدمة حقيقية، يظهر أنهم معتادون على استقبال السياح.",
    },
  },
  {
    id: "demo-3",
    author: "Youssef A.",
    origin: "Inezgane",
    rating: 5,
    period: "Juin 2026",
    vehicle: "Dacia Duster",
    verified: true,
    quote: {
      fr: "Nous avons pris le 4x4 pour Paradise Valley. Voiture entretenue, pneus neufs, aucun souci sur la piste. Départ et retour réglés en dix minutes.",
      en: "We took the 4x4 to Paradise Valley. Well-maintained car, new tyres, no trouble on the track. Pick-up and return sorted in ten minutes.",
      ar: "أخذنا سيارة الدفع الرباعي إلى باراديس فالي. سيارة مصانة وعجلات جديدة، ولا مشكلة على المسلك. الاستلام والإرجاع في عشر دقائق.",
    },
  },
];

/** Moyenne des notes, arrondie au dixième. */
export function averageRating(reviews: Testimonial[] = TESTIMONIALS): number {
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}
