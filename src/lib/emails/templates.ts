import { AGENCY } from "@/config/agency";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";

/**
 * Gabarits d'emails. HTML en tableaux et styles en ligne : c'est la seule
 * façon d'obtenir un rendu correct dans Gmail, Outlook et les clients mobiles.
 */

/**
 * Marqueur remplacé à l'envoi par les coordonnées saisies dans
 * /admin/parametres (voir `renderContactBlock` dans src/lib/mailer.ts).
 *
 * Les gabarits restent ainsi synchrones — ils sont appelés depuis une
 * douzaine d'endroits — tout en affichant des coordonnées à jour : si le
 * gérant change de numéro, les emails suivants le reprennent aussitôt.
 */
export const CONTACT_PLACEHOLDER = "<!--anach:contact-->";
const CONTACT_BLOCK = CONTACT_PLACEHOLDER;

/** Idem pour le numéro cité dans le corps des messages. */
export const MOBILE_PLACEHOLDER = "<!--anach:mobile-->";

const TEAL = "#0f8c86";
const NAVY = "#08293c";
const BORDER = "#e4eaea";

function layout(params: { title: string; preheader: string; body: string }): string {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${params.title}</title></head>
<body style="margin:0;padding:0;background:#f4f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${NAVY};">
  <span style="display:none;font-size:1px;color:#f4f7f7;">${params.preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BORDER};border-radius:14px;overflow:hidden;">
        <tr><td style="background:${NAVY};padding:22px 28px;">
          <span style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:-0.3px;">${AGENCY.name}</span>
          <span style="color:${TEAL};font-size:19px;font-weight:700;"> ·</span>
          <span style="color:#9fb6c2;font-size:13px;"> ${AGENCY.tagline}</span>
        </td></tr>
        <tr><td style="padding:30px 28px 8px;">${params.body}</td></tr>
        <tr><td style="padding:22px 28px 28px;border-top:1px solid ${BORDER};color:#6b7f88;font-size:12px;line-height:1.7;">
          ${CONTACT_BLOCK}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:9px 0;color:#6b7f88;font-size:13px;border-bottom:1px solid ${BORDER};">${label}</td>
    <td style="padding:9px 0;color:${NAVY};font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid ${BORDER};">${value}</td>
  </tr>`;
}

export type ReservationEmailData = {
  reference: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  vehicleLabel: string;
  startAt: Date;
  endAt: Date;
  days: number;
  totalAmount: number;
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
  comment?: string | null;
};

function detailsTable(data: ReservationEmailData): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px;">
    ${detailRow("Référence", data.reference)}
    ${detailRow("Véhicule", data.vehicleLabel)}
    ${detailRow("Départ", formatDateTime(data.startAt))}
    ${detailRow("Retour", formatDateTime(data.endAt))}
    ${detailRow("Durée", `${data.days} jour${data.days > 1 ? "s" : ""}`)}
    ${data.pickupLocation ? detailRow("Prise en charge", data.pickupLocation) : ""}
    ${data.dropoffLocation ? detailRow("Restitution", data.dropoffLocation) : ""}
    ${detailRow("Montant estimé", formatMoney(data.totalAmount))}
  </table>`;
}

/** À l'agence : une nouvelle demande vient d'arriver. */
export function newReservationForAgency(data: ReservationEmailData) {
  return {
    subject: `Nouvelle demande de réservation ${data.reference} — ${data.vehicleLabel}`,
    html: layout({
      title: "Nouvelle demande de réservation",
      preheader: `${data.customerName} demande ${data.vehicleLabel}`,
      body: `
        <h1 style="margin:0 0 6px;font-size:21px;">Nouvelle demande de réservation</h1>
        <p style="margin:0 0 4px;color:#41606f;font-size:14px;line-height:1.6;">
          <strong>${data.customerName}</strong> vient d'envoyer une demande depuis le site.
          Elle est <strong>en attente de votre validation</strong>.
        </p>
        ${detailsTable(data)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;">
          ${detailRow("Téléphone", data.customerPhone)}
          ${data.customerEmail ? detailRow("Email", data.customerEmail) : ""}
        </table>
        ${
          data.comment
            ? `<p style="margin:12px 0;padding:12px 14px;background:#f4f7f7;border-radius:8px;font-size:13px;color:#41606f;"><strong>Message du client :</strong><br>${data.comment}</p>`
            : ""
        }
        <p style="margin:22px 0 6px;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/reservations"
             style="display:inline-block;background:${TEAL};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:9px;font-size:14px;font-weight:600;">
            Ouvrir le dashboard
          </a>
        </p>`,
    }),
  };
}

/** Au client : accusé de réception (la demande n'est PAS encore confirmée). */
export function reservationReceivedForCustomer(data: ReservationEmailData) {
  return {
    subject: `Votre demande ${data.reference} a bien été reçue — ${AGENCY.name}`,
    html: layout({
      title: "Demande reçue",
      preheader: `Demande ${data.reference} en attente de confirmation`,
      body: `
        <h1 style="margin:0 0 6px;font-size:21px;">Merci ${data.customerName} !</h1>
        <p style="margin:0 0 4px;color:#41606f;font-size:14px;line-height:1.6;">
          Votre demande de réservation a bien été enregistrée. Notre équipe la vérifie
          et vous confirme la disponibilité dans les plus brefs délais.
        </p>
        <p style="margin:14px 0;padding:11px 14px;background:#fff6e8;border-left:3px solid #e0972a;border-radius:6px;font-size:13px;color:#7a5410;">
          Statut : <strong>En attente de confirmation</strong>
        </p>
        ${detailsTable(data)}
        <p style="margin:18px 0 0;color:#6b7f88;font-size:13px;line-height:1.6;">
          Une question ? Appelez-nous au ${MOBILE_PLACEHOLDER}.
        </p>`,
    }),
  };
}

/** Au client : l'agence a validé. */
export function reservationConfirmedForCustomer(data: ReservationEmailData) {
  return {
    subject: `Réservation confirmée ${data.reference} — ${AGENCY.name}`,
    html: layout({
      title: "Réservation confirmée",
      preheader: `${data.vehicleLabel} vous attend`,
      body: `
        <h1 style="margin:0 0 6px;font-size:21px;">Votre réservation est confirmée</h1>
        <p style="margin:0 0 4px;color:#41606f;font-size:14px;line-height:1.6;">
          Bonjour ${data.customerName}, votre ${data.vehicleLabel} est bloquée à votre nom.
        </p>
        <p style="margin:14px 0;padding:11px 14px;background:#eaf7f5;border-left:3px solid ${TEAL};border-radius:6px;font-size:13px;color:#0b5a55;">
          Statut : <strong>Confirmée</strong>
        </p>
        ${detailsTable(data)}
        <p style="margin:18px 0 0;color:#6b7f88;font-size:13px;line-height:1.6;">
          Pensez à vous munir de votre CIN ou passeport et de votre permis de conduire
          lors de la prise du véhicule.
        </p>`,
    }),
  };
}

/** Au client : l'agence ne peut pas honorer la demande. */
export function reservationRejectedForCustomer(
  data: ReservationEmailData & { reason?: string | null },
) {
  return {
    subject: `Votre demande ${data.reference} — ${AGENCY.name}`,
    html: layout({
      title: "Demande non retenue",
      preheader: "Nous ne pouvons pas honorer cette demande",
      body: `
        <h1 style="margin:0 0 6px;font-size:21px;">Nous sommes désolés</h1>
        <p style="margin:0 0 4px;color:#41606f;font-size:14px;line-height:1.6;">
          Bonjour ${data.customerName}, nous ne pouvons malheureusement pas honorer votre
          demande ${data.reference} pour la ${data.vehicleLabel}.
        </p>
        ${
          data.reason
            ? `<p style="margin:12px 0;padding:12px 14px;background:#f4f7f7;border-radius:8px;font-size:13px;color:#41606f;">${data.reason}</p>`
            : ""
        }
        <p style="margin:14px 0 0;color:#41606f;font-size:14px;line-height:1.6;">
          D'autres véhicules sont probablement disponibles sur vos dates :
          appelez-nous au ${MOBILE_PLACEHOLDER}, nous trouverons une solution.
        </p>`,
    }),
  };
}

/** Au client : rappel la veille du départ. */
export function rentalReminderForCustomer(data: ReservationEmailData) {
  return {
    subject: `Rappel : votre location démarre demain (${data.reference})`,
    html: layout({
      title: "Votre location démarre demain",
      preheader: `${data.vehicleLabel} — ${formatDateTime(data.startAt)}`,
      body: `
        <h1 style="margin:0 0 6px;font-size:21px;">À demain !</h1>
        <p style="margin:0 0 4px;color:#41606f;font-size:14px;line-height:1.6;">
          Bonjour ${data.customerName}, votre location démarre demain.
          Documents à apporter : CIN ou passeport, permis de conduire.
        </p>
        ${detailsTable(data)}`,
    }),
  };
}
