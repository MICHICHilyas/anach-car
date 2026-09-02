/**
 * Réaligne les compteurs de numérotation sur les données réellement en base.
 *
 *   npm run db:sync-counters
 *
 * À lancer après un import de l'existant, une restauration de sauvegarde ou
 * une insertion manuelle : sans cela, le prochain numéro attribué retomberait
 * sur une référence déjà prise.
 *
 * La numérotation sait déjà se réparer d'elle-même (src/lib/reference.ts),
 * mais ce script évite de lui faire parcourir des dizaines de numéros pris
 * lors du premier enregistrement.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/** Extrait le plus grand numéro d'une série de références. */
function highest(values: string[], pattern: RegExp): number {
  return values.reduce((max, value) => {
    const match = value.match(pattern);
    const parsed = match ? Number(match[1]) : 0;
    return Number.isFinite(parsed) && parsed > max ? parsed : max;
  }, 0);
}

async function main() {
  const [reservations, vehicles] = await Promise.all([
    db.reservation.findMany({ select: { reference: true } }),
    db.vehicle.findMany({ select: { internalCode: true } }),
  ]);

  // Les réservations sont numérotées par année.
  const byYear = new Map<string, string[]>();
  for (const { reference } of reservations) {
    const year = reference.match(/^AC-(\d{4})-/)?.[1];
    if (!year) continue;
    (byYear.get(year) ?? byYear.set(year, []).get(year)!).push(reference);
  }

  const updates: { key: string; value: number }[] = [];

  for (const [year, references] of byYear) {
    updates.push({
      key: `reservation:${year}`,
      value: highest(references, /^AC-\d{4}-(\d+)$/),
    });
  }

  updates.push({
    key: "vehicle",
    value: highest(
      vehicles.map((vehicle) => vehicle.internalCode),
      /^AC-V-(\d+)$/,
    ),
  });

  console.info("Compteurs :\n");
  for (const { key, value } of updates) {
    const before = await db.counter.findUnique({ where: { key } });
    // On ne recule jamais un compteur : il peut légitimement être en avance
    // (réservations supprimées, numéros brûlés).
    const target = Math.max(value, before?.value ?? 0);

    await db.counter.upsert({
      where: { key },
      create: { key, value: target },
      update: { value: target },
    });

    const status =
      before?.value === target
        ? "déjà aligné"
        : `${before?.value ?? "absent"} -> ${target}`;
    console.info(`  ${key.padEnd(20)} ${status}`);
  }

  console.info("\nTerminé.\n");
}

main()
  .catch((error) => {
    console.error(`\nErreur : ${error instanceof Error ? error.message : error}\n`);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
