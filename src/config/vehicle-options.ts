/**
 * Suggestions de saisie pour la fiche véhicule.
 *
 * Ce ne sont pas des listes fermées : les champs restent libres, un modèle
 * absent d'ici peut toujours être saisi à la main. L'objectif est d'éviter
 * les fautes de frappe et les doublons du type « Peugeot 208 » /
 * « peugeot 208 » / « Peugeot208 », qui cassent ensuite les filtres du
 * catalogue et les regroupements du tableau de bord.
 *
 * Marques et modèles retenus : ceux réellement présents sur le marché
 * marocain de la location. À compléter librement.
 */
export const VEHICLE_MODELS: Record<string, string[]> = {
  Dacia: [
    "Logan", "Sandero", "Sandero Stepway", "Duster", "Lodgy", "Dokker",
    "Jogger", "Spring",
  ],
  Renault: [
    "Clio 4", "Clio 5", "Symbol", "Mégane", "Captur", "Kadjar", "Austral",
    "Express", "Kangoo", "Trafic", "Talisman",
  ],
  Peugeot: [
    "108", "208", "2008", "301", "308", "3008", "5008", "508", "Partner",
    "Expert", "Rifter",
  ],
  Citroën: [
    "C3", "C3 Aircross", "C4", "C-Elysée", "C5 Aircross", "Berlingo", "Jumpy",
  ],
  Hyundai: [
    "i10", "i20", "i30", "Accent", "Elantra", "Creta", "Tucson", "Santa Fe",
    "H1",
  ],
  Kia: ["Picanto", "Rio", "Cerato", "Seltos", "Sportage", "Sorento", "Carens"],
  Volkswagen: [
    "Polo", "Golf", "Passat", "T-Roc", "T-Cross", "Tiguan", "Caddy", "Touran",
  ],
  Fiat: ["Panda", "500", "Tipo", "Punto", "Doblo"],
  Ford: ["Fiesta", "Focus", "EcoSport", "Kuga", "Transit", "Ranger"],
  Toyota: [
    "Yaris", "Corolla", "C-HR", "RAV4", "Hilux", "Land Cruiser", "Prius",
  ],
  Nissan: ["Micra", "Juke", "Qashqai", "X-Trail", "Navara"],
  Seat: ["Ibiza", "Leon", "Arona", "Ateca"],
  Škoda: ["Fabia", "Octavia", "Scala", "Karoq", "Kodiaq", "Superb"],
  Opel: ["Corsa", "Astra", "Crossland", "Mokka", "Combo"],
  Suzuki: ["Swift", "Baleno", "Ignis", "Vitara", "Jimny"],
  "Mercedes-Benz": [
    "Classe A", "Classe C", "Classe E", "GLA", "GLC", "Vito", "Sprinter",
  ],
  BMW: ["Série 1", "Série 2", "Série 3", "Série 5", "X1", "X3"],
  Audi: ["A1", "A3", "A4", "Q2", "Q3", "Q5"],
  MG: ["MG3", "MG5", "ZS", "HS"],
  Jeep: ["Renegade", "Compass"],
  Chery: ["Tiggo 4", "Tiggo 7", "Tiggo 8"],
  Changan: ["Alsvin", "CS35", "CS55"],
  BYD: ["Dolphin", "Atto 3", "Seal"],
  Mitsubishi: ["ASX", "Outlander", "L200"],
  Honda: ["Jazz", "Civic", "CR-V"],
  Mazda: ["2", "3", "CX-3", "CX-5"],
};

export const VEHICLE_BRANDS = Object.keys(VEHICLE_MODELS).sort((a, b) =>
  a.localeCompare(b, "fr"),
);

/** Toutes les carrosseries confondues, pour une marque encore inconnue. */
export const ALL_MODELS = Array.from(
  new Set(Object.values(VEHICLE_MODELS).flat()),
).sort((a, b) => a.localeCompare(b, "fr"));

export const VEHICLE_COLORS = [
  "Blanc",
  "Blanc nacré",
  "Noir",
  "Gris métallisé",
  "Gris anthracite",
  "Argent",
  "Bleu",
  "Bleu marine",
  "Rouge",
  "Bordeaux",
  "Beige",
  "Marron",
  "Vert",
  "Orange",
  "Jaune",
];

/**
 * Modèles proposés pour une marque donnée.
 * La comparaison ignore la casse et les espaces : « renault » trouve
 * « Renault ». Marque inconnue ou vide : on propose tout.
 */
export function modelsForBrand(brand: string): string[] {
  const normalized = brand.trim().toLowerCase();
  if (!normalized) return ALL_MODELS;

  const match = Object.keys(VEHICLE_MODELS).find(
    (known) => known.toLowerCase() === normalized,
  );
  return match ? VEHICLE_MODELS[match] : ALL_MODELS;
}
