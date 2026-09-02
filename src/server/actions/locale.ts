"use server";

import { cookies } from "next/headers";
import { isLocale } from "@/i18n/config";

/**
 * Mémorise la langue choisie par le visiteur.
 *
 * L'écriture se fait côté serveur : le composant client n'a pas à toucher à
 * `document.cookie`, et le middleware retrouve la préférence dès la requête
 * suivante.
 */
export async function rememberLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
