import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Jetons de consultation des réservations.
 *
 * Les références (AC-2026-00124) sont séquentielles, donc devinables : les
 * exposer seules permettrait de lire les données d'autres clients en
 * incrémentant un numéro. La page de confirmation exige donc un jeton HMAC
 * dérivé de la référence et du secret serveur — impossible à fabriquer sans
 * AUTH_SECRET, et sans colonne supplémentaire en base.
 */
function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error(
      "AUTH_SECRET est manquant ou trop court (32 caractères minimum recommandés).",
    );
  }
  return value;
}

export function signReference(reference: string): string {
  return createHmac("sha256", secret())
    .update(`reservation:${reference}`)
    .digest("hex")
    .slice(0, 24);
}

export function verifyReferenceToken(
  reference: string,
  token: string | undefined | null,
): boolean {
  if (!token) return false;
  const expected = signReference(reference);
  if (expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
