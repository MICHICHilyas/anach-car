/**
 * Retire les données de démonstration avant la mise en ligne.
 *
 *   npm run db:prepare-production            (aperçu, ne modifie rien)
 *   npm run db:prepare-production -- --go    (exécute réellement)
 *
 * Ce que le script supprime :
 *   - les clients de démonstration, leurs réservations, locations et pièces,
 *     FICHIERS COMPRIS : supprimer la ligne en base sans le fichier laisserait
 *     des pièces d'identité sur le disque, sans plus rien pour les retrouver ;
 *   - les véhicules d'exemple listés dans DEMO_PLATES ;
 *   - les comptes de démonstration, dont le mot de passe figure au README.
 *
 * Ce qu'il conserve :
 *   - les véhicules réellement saisis par l'agence, et leurs photos ;
 *   - les lieux de prise en charge et les paramètres ;
 *   - au moins un compte administrateur : sans cela, personne ne pourrait
 *     plus entrer dans l'espace agence.
 *
 * Le script REFUSE de s'exécuter si des réservations sont rattachées à des
 * véhicules conservés : ce serait le signe que de vraies locations existent
 * déjà, et il ne doit alors surtout pas les effacer.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/** Plaques des véhicules d'exemple créés par `npm run db:seed`. */
const DEMO_PLATES = [
  "12345-A-6", "23456-B-6", "34567-C-6", "45678-D-6", "56789-E-6",
  "67890-F-6", "78901-G-6", "89012-H-6", "90123-J-6", "01234-K-6",
];

/** Comptes créés par le seed, dont le mot de passe est public. */
const DEMO_ACCOUNTS = ["admin@anachcar.ma", "agence@anachcar.ma"];

const apply = process.argv.includes("--go");

async function main() {
  const demoVehicles = await db.vehicle.findMany({
    where: { plate: { in: DEMO_PLATES } },
    select: { id: true, brand: true, model: true, plate: true },
  });
  const demoIds = demoVehicles.map((v) => v.id);

  const kept = await db.vehicle.findMany({
    where: { plate: { notIn: DEMO_PLATES } },
    select: { id: true, brand: true, model: true, plate: true },
  });

  /*
   * Garde-fou : une réservation sur un véhicule conservé peut être une vraie
   * location. On ne devine pas — on s'arrête et on laisse un humain trancher.
   */
  const onKept = await db.reservation.count({
    where: { vehicleId: { in: kept.map((v) => v.id) } },
  });

  const customers = await db.customer.count();
  const reservations = await db.reservation.count();
  const documents = await db.document.count();

  console.log("\n── Véhicules conservés ──");
  for (const v of kept) console.log(`  ✓ ${v.brand} ${v.model} (${v.plate})`);
  console.log("\n── Véhicules supprimés (exemples) ──");
  for (const v of demoVehicles) console.log(`  ✗ ${v.brand} ${v.model} (${v.plate})`);
  console.log(
    `\n── Également supprimés ──\n` +
      `  ${customers} client(s), ${reservations} réservation(s), ${documents} pièce(s) jointe(s)\n` +
      `  comptes de démonstration : ${DEMO_ACCOUNTS.join(", ")}`,
  );

  if (onKept > 0 && !process.argv.includes("--force")) {
    console.error(
      `\n⛔ ${onKept} réservation(s) portent sur des véhicules conservés.\n` +
        `   Ce sont peut-être de vraies locations : le script s'arrête.\n` +
        `   Vérifiez dans /admin/reservations, puis relancez avec --force\n` +
        `   si ces réservations sont bien des essais.`,
    );
    process.exit(1);
  }

  if (!apply) {
    console.log(
      "\nAperçu uniquement — rien n'a été modifié." +
        "\nPour exécuter : npm run db:prepare-production -- --go\n",
    );
    return;
  }

  /*
   * On relève les fichiers à effacer AVANT la transaction : une fois les
   * lignes parties, plus rien ne dit où vivent les pièces jointes.
   */
  const documentKeys = (
    await db.document.findMany({ select: { storageKey: true } })
  ).map((d) => d.storageKey);

  const demoImageUrls = (
    await db.vehicleImage.findMany({
      where: { vehicleId: { in: demoIds } },
      select: { url: true },
    })
  ).map((i) => i.url);

  await db.$transaction(async (tx) => {
    // L'ordre suit les dépendances : les enfants avant les parents.
    await tx.document.deleteMany({});
    await tx.rental.deleteMany({});
    await tx.reservation.deleteMany({});
    await tx.customer.deleteMany({});

    await tx.vehicleImage.deleteMany({ where: { vehicleId: { in: demoIds } } });
    await tx.maintenanceRecord.deleteMany({ where: { vehicleId: { in: demoIds } } });
    await tx.maintenance.deleteMany({ where: { vehicleId: { in: demoIds } } });
    await tx.pricingRule.deleteMany({ where: { vehicleId: { in: demoIds } } });
    await tx.vehicle.deleteMany({ where: { id: { in: demoIds } } });

    await tx.notification.deleteMany({});
    await tx.auditLog.deleteMany({});

    /*
     * Les comptes de démonstration ne partent que s'il reste un administrateur
     * actif : mieux vaut un compte de trop qu'une agence enfermée dehors.
     */
    const survivors = await tx.user.count({
      where: { role: "ADMIN", isActive: true, email: { notIn: DEMO_ACCOUNTS } },
    });
    if (survivors > 0) {
      await tx.user.deleteMany({ where: { email: { in: DEMO_ACCOUNTS } } });
    } else {
      console.warn(
        "\n⚠️  Comptes de démonstration CONSERVÉS : aucun autre administrateur\n" +
          "   actif n'existe. Créez-en un (npm run create-admin), puis relancez.",
      );
    }
  });

  // Les compteurs doivent repartir à zéro : la première vraie réservation
  // doit porter le numéro 0001, pas la suite des essais supprimés.
  await db.counter.deleteMany({});

  /*
   * Les fichiers, enfin. Après la transaction : une pièce d'identité laissée
   * sur le disque après la suppression de sa ligne serait invisible depuis
   * l'application et introuvable autrement — exactement ce que la page de
   * confidentialité promet de ne pas faire.
   */
  const { deleteStoredFile } = await import("../src/lib/storage");
  const keys = [
    ...documentKeys,
    // Les URL de photos sont de la forme /api/media/<clé>.
    ...demoImageUrls
      .map((url) => url.replace(/^\/api\/media\//, ""))
      .filter((key) => key.startsWith("vehicles/")),
  ];

  let removed = 0;
  for (const key of keys) {
    try {
      await deleteStoredFile(key);
      removed += 1;
    } catch (error) {
      console.warn(`  ⚠️  fichier non supprimé : ${key} (${String(error)})`);
    }
  }
  if (keys.length > 0) {
    console.log(`\n  ${removed}/${keys.length} fichier(s) effacé(s) du stockage.`);
  }

  console.log("\n✓ Base prête pour la mise en ligne.\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
