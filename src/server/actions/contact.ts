"use server";

import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mailer";
import { createNotification } from "@/lib/notifications";
import { contactSchema } from "@/lib/validation/reservation";
import { AGENCY } from "@/config/agency";
import { NotificationSeverity, NotificationType } from "@/generated/prisma/enums";

export type ContactResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Formulaire de contact public : validé, limité en débit, protégé anti-robot. */
export async function sendContactMessage(input: unknown): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Merci de vérifier les champs signalés.", fieldErrors };
  }

  const data = parsed.data;
  if (data.website) return { ok: false, error: "Requête invalide." };

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = rateLimit(`contact:${ip}`, 3, 600);
  if (!limit.allowed) {
    return {
      ok: false,
      error: `Trop de messages envoyés. Réessayez dans ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
    };
  }

  const html = `
    <h2 style="font-family:sans-serif;">Nouveau message depuis le site</h2>
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:6px 12px 6px 0;color:#6b7f88;">Nom</td><td><strong>${escapeHtml(data.name)}</strong></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#6b7f88;">Téléphone</td><td>${escapeHtml(data.phone)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#6b7f88;">Email</td><td>${escapeHtml(data.email ?? "—")}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#6b7f88;">Sujet</td><td>${escapeHtml(data.subject)}</td></tr>
    </table>
    <p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap;margin-top:16px;">${escapeHtml(data.message)}</p>
  `;

  await Promise.allSettled([
    sendMail({
      to: process.env.EMAIL_AGENCY_INBOX ?? AGENCY.email,
      replyTo: data.email || undefined,
      subject: `[Site] ${data.subject} — ${data.name}`,
      html,
    }),
    createNotification({
      type: NotificationType.SYSTEM,
      severity: NotificationSeverity.INFO,
      title: `Message de ${data.name}`,
      message: `${data.subject} · ${data.phone}`,
      link: "/admin/notifications",
    }),
  ]);

  return { ok: true };
}

/** Neutralise le HTML avant insertion dans l'email. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
