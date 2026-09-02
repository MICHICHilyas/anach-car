import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES, isLocale } from "@/i18n/config";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

/**
 * Middleware :
 *  1. préfixe les URL publiques par la langue (/  ->  /fr) ;
 *  2. expose la langue courante aux composants serveur via l'en-tête x-locale ;
 *  3. écarte les visiteurs non connectés des routes /admin.
 *
 * Point important : le contrôle d'accès du middleware n'est qu'un
 * pré-filtrage (il ne voit qu'un cookie, pas la base). La véritable
 * vérification a lieu dans requireUser(), appelée par chaque layout, route
 * handler et server action de l'espace agence.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // --- Espace agence : français uniquement, session obligatoire ---
  if (pathname.startsWith("/admin")) {
    const isLoginPage = pathname === "/admin/login";
    const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

    if (!hasSession && !isLoginPage) {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    if (hasSession && isLoginPage) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return withLocaleHeader(request, DEFAULT_LOCALE);
  }

  // --- Site public : /vehicules -> /fr/vehicules ---
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  if (first && isLocale(first)) {
    return withLocaleHeader(request, first);
  }

  const locale = detectLocale(request);
  const url = new URL(`/${locale}${pathname === "/" ? "" : pathname}${search}`, request.url);
  return NextResponse.redirect(url);
}

function withLocaleHeader(request: NextRequest, locale: string) {
  const headers = new Headers(request.headers);
  headers.set("x-locale", locale);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

/** Négociation de langue : cookie, puis en-tête Accept-Language, puis français. */
function detectLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get("locale")?.value;
  if (cookieLocale && isLocale(cookieLocale)) return cookieLocale;

  const accepted = request.headers.get("accept-language") ?? "";
  for (const part of accepted.split(",")) {
    const tag = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (tag && LOCALES.includes(tag as never)) return tag;
  }
  return DEFAULT_LOCALE;
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf :
     *  - /api        : les routes gèrent leur propre authentification ;
     *  - /_next      : ressources générées par Next.js ;
     *  - tout chemin se terminant par une extension de fichier
     *    (favicon.png, robots.txt, sitemap.xml, /brand/logo.png, /images/…).
     *    Aucune page du site ne se termine par une extension : ce motif
     *    évite d'oublier un fichier statique lors d'un ajout.
     */
    "/((?!api|_next|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
