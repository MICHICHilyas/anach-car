import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { LOCALES } from "@/i18n/config";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Plan du site : pages statiques dans les trois langues + une entrée par
 * véhicule en ligne. Les véhicules archivés en sortent automatiquement.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    { path: "", priority: 1, changeFrequency: "daily" as const },
    { path: "/vehicules", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/a-propos", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/conditions-generales", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/annulation", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/mentions-legales", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/confidentialite", priority: 0.2, changeFrequency: "yearly" as const },
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const item of staticPaths) {
      entries.push({
        url: `${siteUrl}/${locale}${item.path}`,
        lastModified: new Date(),
        changeFrequency: item.changeFrequency,
        priority: item.priority,
      });
    }
  }

  const vehicles = await db.vehicle
    .findMany({
      where: { archivedAt: null },
      select: { slug: true, updatedAt: true },
    })
    .catch(() => []);

  for (const locale of LOCALES) {
    for (const vehicle of vehicles) {
      entries.push({
        url: `${siteUrl}/${locale}/vehicules/${vehicle.slug}`,
        lastModified: vehicle.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  return entries;
}
