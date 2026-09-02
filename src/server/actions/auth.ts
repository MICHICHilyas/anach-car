"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  getCurrentUser,
  purgeExpiredSessions,
  verifyPassword,
} from "@/lib/auth";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe obligatoire"),
  redirectTo: z.string().optional(),
});

export type LoginResult = { ok: false; error: string } | { ok: true; redirectTo: string };

/**
 * Connexion au dashboard.
 *
 * Volontairement avare en informations : un email inconnu et un mot de passe
 * erroné renvoient le même message, pour ne pas permettre d'énumérer les
 * comptes existants. Cinq tentatives par IP et par tranche de 5 minutes.
 */
export async function login(input: unknown): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Email ou mot de passe invalide." };
  }

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `login:${ip}`;
  const limit = rateLimit(key, 5, 300);
  if (!limit.allowed) {
    return {
      ok: false,
      error: `Trop de tentatives. Réessayez dans ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
    };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, name: true, passwordHash: true, isActive: true, role: true, email: true },
  });

  const valid = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : // Comparaison à vide : le temps de réponse reste comparable, que le
      // compte existe ou non.
      await verifyPassword(parsed.data.password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin");

  if (!user || !valid || !user.isActive) {
    return { ok: false, error: "Email ou mot de passe invalide." };
  }

  resetRateLimit(key);
  await purgeExpiredSessions();
  await createSession(user.id);
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await logAudit({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    action: "auth.login",
    summary: `${user.name} s'est connecté`,
  });

  const target = parsed.data.redirectTo;
  const safeTarget = target && target.startsWith("/admin") ? target : "/admin";
  return { ok: true, redirectTo: safeTarget };
}

export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await logAudit({
      user,
      action: "auth.logout",
      summary: `${user.name} s'est déconnecté`,
    });
  }
  await destroySession();
  redirect("/admin/login");
}
