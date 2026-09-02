import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { UserRole } from "@/generated/prisma/enums";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

/**
 * Authentification du personnel de l'agence.
 *
 * Choix d'architecture : sessions opaques en base plutôt que JWT auto-porté.
 * Le cookie ne contient qu'un jeton aléatoire ; seul son hash SHA-256 est
 * stocké. Conséquences : une session peut être révoquée instantanément
 * (désactivation d'un employé) et le vol du cookie ne révèle aucune donnée.
 */

export const SESSION_COOKIE = SESSION_COOKIE_NAME;
const SESSION_MAX_AGE_DAYS = Number(process.env.SESSION_MAX_AGE_DAYS ?? 7);
const BCRYPT_ROUNDS = 12;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Comparaison à temps constant, pour ne pas laisser fuir d'information par
 * la durée de la réponse.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
  );

  const headerList = await headers();
  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: headerList.get("user-agent")?.slice(0, 255) ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Utilisateur de la requête courante, ou null.
 * Mémoïsé : le layout, la sidebar et chaque server action peuvent l'appeler
 * sans multiplier les requêtes SQL.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: { id: true, email: true, name: true, role: true, isActive: true },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.isActive) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
});

/**
 * Garde-fou à utiliser dans TOUT layout admin, route handler et server
 * action. C'est ici que se joue la sécurité : le middleware ne fait qu'un
 * pré-filtrage cosmétique.
 */
export async function requireUser(
  allowedRoles?: UserRole[],
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect("/admin?error=forbidden");
  }
  return user;
}

/** Variante non redirigeante, pour les server actions qui renvoient une erreur. */
export async function requireUserOrThrow(
  allowedRoles?: UserRole[],
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Session expirée. Veuillez vous reconnecter.");
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error("Vous n'avez pas les droits nécessaires pour cette action.");
  }
  return user;
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === UserRole.ADMIN;
}

/** Nettoyage des sessions expirées (appelé à chaque connexion). */
export async function purgeExpiredSessions(): Promise<void> {
  await db.session
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => undefined);
}
