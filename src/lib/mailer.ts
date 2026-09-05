import "server-only";
import {
  CONTACT_PLACEHOLDER,
  MOBILE_PLACEHOLDER,
} from "@/lib/emails/templates";

/**
 * Envoi d'emails transactionnels.
 *
 * Deux pilotes : `console` (développement — l'email est affiché dans le
 * terminal, rien n'est envoyé) et `resend` (production, via une simple
 * requête HTTP : aucun SDK supplémentaire à installer).
 *
 * Un échec d'envoi ne fait jamais échouer l'action métier : une réservation
 * reste valide même si l'email de confirmation n'est pas parti.
 */

export type MailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type MailResult = { sent: boolean; skipped?: string; error?: string };

/**
 * Injecte les coordonnées de l'agence dans le gabarit.
 *
 * Les gabarits posent des marqueurs plutôt que d'appeler la base : ils sont
 * synchrones et utilisés depuis de nombreux endroits. La substitution a lieu
 * ici, au seul point par lequel passe tout envoi — un numéro modifié dans
 * /admin/parametres est donc repris par l'email suivant, sans redéploiement.
 *
 * En cas de base indisponible, on retombe sur les valeurs de configuration :
 * un email au pied de page daté vaut mieux qu'un email non envoyé.
 */
async function injectAgencyContact(html: string): Promise<string> {
  if (
    !html.includes(CONTACT_PLACEHOLDER) &&
    !html.includes(MOBILE_PLACEHOLDER)
  ) {
    return html;
  }

  const { getAgencyContact } = await import("@/lib/settings");
  const { AGENCY } = await import("@/config/agency");

  let agency;
  try {
    agency = await getAgencyContact();
  } catch {
    agency = {
      address: AGENCY.address.full,
      phone: AGENCY.phone.landline,
      mobile: AGENCY.phone.mobile,
      email: AGENCY.email,
    };
  }

  const block =
    `${escapeHtml(agency.address)}<br>` +
    `Tél. ${escapeHtml(agency.phone)} · Mobile ${escapeHtml(agency.mobile)}<br>` +
    `<a href="mailto:${escapeHtml(agency.email)}" style="color:#0f8c86;text-decoration:none;">` +
    `${escapeHtml(agency.email)}</a>`;

  return html
    .split(CONTACT_PLACEHOLDER)
    .join(block)
    .split(MOBILE_PLACEHOLDER)
    .join(escapeHtml(agency.mobile));
}

/** Les coordonnées sont saisies par l'agence : on les échappe malgré tout. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const driver = process.env.EMAIL_DRIVER ?? "console";
  const from = process.env.EMAIL_FROM ?? "Anach Car <no-reply@anachcar.ma>";
  const recipients = Array.isArray(message.to) ? message.to : [message.to];

  message = { ...message, html: await injectAgencyContact(message.html) };

  if (recipients.filter(Boolean).length === 0) {
    return { sent: false, skipped: "aucun destinataire" };
  }

  if (driver === "console") {
    console.info(
      [
        "",
        "──────────── EMAIL (mode console) ────────────",
        `De      : ${from}`,
        `À       : ${recipients.join(", ")}`,
        `Sujet   : ${message.subject}`,
        "──────────────────────────────────────────────",
        message.text ?? stripHtml(message.html),
        "──────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { sent: true, skipped: "driver console" };
  }

  if (driver === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { sent: false, error: "RESEND_API_KEY manquant" };

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: recipients,
          subject: message.subject,
          html: message.html,
          text: message.text ?? stripHtml(message.html),
          reply_to: message.replyTo,
        }),
      });
      if (!response.ok) {
        return { sent: false, error: `Resend a répondu ${response.status}` };
      }
      return { sent: true };
    } catch (error) {
      return { sent: false, error: (error as Error).message };
    }
  }

  return { sent: false, skipped: `driver inconnu : ${driver}` };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
