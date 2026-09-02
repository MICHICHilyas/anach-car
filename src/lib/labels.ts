import {
  CustomerStatus,
  DocumentType,
  FuelLevel,
  FuelType,
  MaintenanceStatus,
  MaintenanceType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  ReservationSource,
  ReservationStatus,
  Transmission,
  UserRole,
  VehicleCategory,
  VehicleStatus,
} from "@/generated/prisma/enums";

/**
 * Libellés français des énumérations + code couleur des badges.
 *
 * Convention visuelle du dashboard (voir §43 du cahier des charges) :
 *   vert = tout va bien · orange = attention · rouge = problème · bleu = info
 */
export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export const VEHICLE_STATUS: Record<VehicleStatus, { label: string; tone: Tone }> = {
  AVAILABLE: { label: "Disponible", tone: "success" },
  RENTED: { label: "En location", tone: "info" },
  MAINTENANCE: { label: "En maintenance", tone: "warning" },
  UNAVAILABLE: { label: "Indisponible", tone: "danger" },
};

export const VEHICLE_CATEGORY: Record<VehicleCategory, string> = {
  ECONOMIQUE: "Économique",
  COMPACTE: "Compacte",
  BERLINE: "Berline",
  SUV: "SUV / 4x4",
  MONOSPACE: "Monospace",
  UTILITAIRE: "Utilitaire",
  LUXE: "Luxe",
};

export const TRANSMISSION: Record<Transmission, string> = {
  MANUAL: "Manuelle",
  AUTOMATIC: "Automatique",
};

export const FUEL: Record<FuelType, string> = {
  DIESEL: "Diesel",
  ESSENCE: "Essence",
  HYBRIDE: "Hybride",
  ELECTRIQUE: "Électrique",
  GPL: "GPL",
};

export const RESERVATION_STATUS: Record<
  ReservationStatus,
  { label: string; tone: Tone; description: string }
> = {
  PENDING: {
    label: "En attente",
    tone: "warning",
    description: "Demande reçue, à valider par l'agence",
  },
  CONFIRMED: {
    label: "Confirmée",
    tone: "info",
    description: "Validée, véhicule bloqué sur la période",
  },
  ACTIVE: {
    label: "En cours",
    tone: "success",
    description: "Le client a le véhicule",
  },
  COMPLETED: {
    label: "Terminée",
    tone: "neutral",
    description: "Véhicule rendu, dossier clos",
  },
  CANCELLED: { label: "Annulée", tone: "danger", description: "Annulée" },
  REJECTED: { label: "Refusée", tone: "danger", description: "Demande refusée" },
};

export const RESERVATION_SOURCE: Record<ReservationSource, string> = {
  WEBSITE: "Site web",
  PHONE: "Téléphone",
  WHATSAPP: "WhatsApp",
  WALK_IN: "Sur place",
  ADMIN: "Saisie agence",
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  UNPAID: { label: "Non payé", tone: "danger" },
  DEPOSIT_PAID: { label: "Acompte payé", tone: "warning" },
  PARTIALLY_PAID: { label: "Partiellement payé", tone: "warning" },
  PAID: { label: "Payé", tone: "success" },
  REFUNDED: { label: "Remboursé", tone: "neutral" },
};

export const PAYMENT_TYPE: Record<PaymentType, string> = {
  DEPOSIT: "Acompte",
  BALANCE: "Solde",
  EXTRA_FEE: "Frais supplémentaires",
  REFUND: "Remboursement",
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  CASH: "Espèces",
  BANK_TRANSFER: "Virement",
  CARD: "Carte bancaire",
  CHECK: "Chèque",
  ONLINE: "Paiement en ligne",
  OTHER: "Autre",
};

export const MAINTENANCE_TYPE: Record<MaintenanceType, string> = {
  OIL_CHANGE: "Vidange",
  TIRES: "Pneus",
  BRAKES: "Freins",
  BATTERY: "Batterie",
  REVISION: "Révision",
  REPAIR: "Réparation",
  CLEANING: "Nettoyage",
  INSURANCE: "Assurance",
  TECHNICAL_INSPECTION: "Visite technique",
  OTHER: "Autre",
};

export const MAINTENANCE_STATUS: Record<
  MaintenanceStatus,
  { label: string; tone: Tone }
> = {
  PLANNED: { label: "Planifiée", tone: "info" },
  IN_PROGRESS: { label: "En cours", tone: "warning" },
  DONE: { label: "Terminée", tone: "success" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
};

export const FUEL_LEVEL: Record<FuelLevel, string> = {
  EMPTY: "Vide",
  QUARTER: "1/4",
  HALF: "1/2",
  THREE_QUARTERS: "3/4",
  FULL: "Plein",
};

export const DOCUMENT_TYPE: Record<DocumentType, string> = {
  CIN: "CIN",
  PASSPORT: "Passeport",
  DRIVER_LICENSE: "Permis de conduire",
  CONTRACT: "Contrat de location",
  INSURANCE: "Assurance",
  TECHNICAL_INSPECTION: "Visite technique",
  VEHICLE_REGISTRATION: "Carte grise",
  INVOICE: "Facture",
  OTHER: "Autre",
};

export const CUSTOMER_STATUS: Record<CustomerStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: "Actif", tone: "success" },
  BLACKLISTED: { label: "Liste noire", tone: "danger" },
};

export const USER_ROLE: Record<UserRole, string> = {
  ADMIN: "Administrateur",
  MANAGER: "Responsable",
  EMPLOYEE: "Employé",
};

/** Options prêtes à l'emploi pour les <Select> des formulaires. */
export function toOptions<T extends string>(
  record: Record<T, string | { label: string }>,
): { value: T; label: string }[] {
  return (Object.entries(record) as [T, string | { label: string }][]).map(
    ([value, entry]) => ({
      value,
      label: typeof entry === "string" ? entry : entry.label,
    }),
  );
}
