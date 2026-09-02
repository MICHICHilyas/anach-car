import "server-only";

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

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const driver = process.env.EMAIL_DRIVER ?? "console";
  const from = process.env.EMAIL_FROM ?? "Anach Car <no-reply@anachcar.ma>";
  const recipients = Array.isArray(message.to) ? message.to : [message.to];

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
