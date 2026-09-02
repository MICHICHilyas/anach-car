import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // L'espace agence et le tunnel de réservation n'ont rien à faire
        // dans un index de moteur de recherche.
        disallow: ["/admin", "/api", "/fr/reservation", "/en/reservation", "/ar/reservation"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
