import { whatsappLink } from "@/config/agency";
import { getAgencyContact } from "@/lib/settings";

/**
 * Génération des liens WhatsApp avec message pré-rempli.
 * Version 1 volontairement simple : lien wa.me, aucune API payante.
 * L'interface est prête pour brancher plus tard l'API Business.
 *
 * Le numéro provient de /admin/parametres : WhatsApp étant le canal
 * principal de l'agence, un numéro périmé ici coûterait des réservations.
 */

export async function whatsappGeneral(): Promise<string> {
  const agency = await getAgencyContact();
  return whatsappLink(
    `Bonjour ${agency.name}, je souhaite avoir des informations sur la location de voitures.`,
    agency.whatsapp,
  );
}

export async function whatsappForVehicle(params: {
  brand: string;
  model: string;
  startLabel?: string;
  endLabel?: string;
}): Promise<string> {
  const agency = await getAgencyContact();
  const { brand, model, startLabel, endLabel } = params;
  const period =
    startLabel && endLabel ? ` du ${startLabel} au ${endLabel}` : "";
  return whatsappLink(
    `Bonjour ${agency.name}, je souhaite réserver une ${brand} ${model}${period}.`,
    agency.whatsapp,
  );
}

export async function whatsappForReservation(params: {
  reference: string;
  brand: string;
  model: string;
  startLabel: string;
  endLabel: string;
}): Promise<string> {
  const agency = await getAgencyContact();
  return whatsappLink(
    `Bonjour ${agency.name}, je vous contacte au sujet de ma réservation ${params.reference} ` +
      `(${params.brand} ${params.model}, du ${params.startLabel} au ${params.endLabel}).`,
    agency.whatsapp,
  );
}

/** Côté agence : relancer un client depuis le dashboard. */
export function whatsappToCustomer(phone: string, message: string): string {
  const normalized = phone.replace(/[^0-9]/g, "").replace(/^0/, "212");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
