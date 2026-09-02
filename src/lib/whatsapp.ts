import { AGENCY, whatsappLink } from "@/config/agency";

/**
 * Génération des liens WhatsApp avec message pré-rempli.
 * Version 1 volontairement simple : lien wa.me, aucune API payante.
 * L'interface est prête pour brancher plus tard l'API Business.
 */

export function whatsappGeneral(): string {
  return whatsappLink(
    `Bonjour ${AGENCY.name}, je souhaite avoir des informations sur la location de voitures.`,
  );
}

export function whatsappForVehicle(params: {
  brand: string;
  model: string;
  startLabel?: string;
  endLabel?: string;
}): string {
  const { brand, model, startLabel, endLabel } = params;
  const period =
    startLabel && endLabel ? ` du ${startLabel} au ${endLabel}` : "";
  return whatsappLink(
    `Bonjour ${AGENCY.name}, je souhaite réserver une ${brand} ${model}${period}.`,
  );
}

export function whatsappForReservation(params: {
  reference: string;
  brand: string;
  model: string;
  startLabel: string;
  endLabel: string;
}): string {
  return whatsappLink(
    `Bonjour ${AGENCY.name}, je vous contacte au sujet de ma réservation ${params.reference} ` +
      `(${params.brand} ${params.model}, du ${params.startLabel} au ${params.endLabel}).`,
  );
}

/** Côté agence : relancer un client depuis le dashboard. */
export function whatsappToCustomer(phone: string, message: string): string {
  const normalized = phone.replace(/[^0-9]/g, "").replace(/^0/, "212");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
