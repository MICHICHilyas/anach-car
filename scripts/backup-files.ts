/**
 * Sauvegarde le magasin de fichiers dans un dossier daté.
 *
 *   npm run backup:files                       (vers ./backups)
 *   npm run backup:files -- --out=/Volumes/Cle (vers un disque externe)
 *
 * Pourquoi ce script existe : la base de données est sauvegardée par
 * l'hébergeur, le magasin de fichiers ne l'est pas. Or la base ne contient
 * que des références — les photos de CIN et de permis vivent dans le magasin.
 * Le perdre, c'est perdre les pièces justificatives de tous les dossiers,
 * y compris les locations en cours : précisément les preuves que l'agence
 * conserve pour se défendre en cas de litige.
 *
 * La sauvegarde inclut un inventaire JSON reliant chaque fichier au dossier
 * client auquel il appartient. Sans lui, on récupérerait un tas d'images aux
 * noms opaques, sans savoir à qui elles appartiennent.
 *
 * À lancer régulièrement, et systématiquement avant toute opération risquée.
 */
import "dotenv/config";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

/** 2026-09-05_14-30 — trié naturellement, lisible sans outil. */
function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}

async function main() {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  const outRoot = path.resolve(argValue("out") ?? "backups");
  const target = path.join(outRoot, `anach-car_${stamp()}`);

  // L'inventaire : qui possède quel fichier. Établi avant toute copie.
  const documents = await db.document.findMany({
    select: {
      storageKey: true, fileName: true, type: true, mimeType: true,
      size: true, createdAt: true,
      customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
  });
  const images = await db.vehicleImage.findMany({
    select: {
      url: true, isPrimary: true,
      vehicle: { select: { brand: true, model: true, plate: true } },
    },
  });

  await mkdir(target, { recursive: true });
  await writeFile(
    path.join(target, "inventaire.json"),
    JSON.stringify({ date: new Date().toISOString(), driver, documents, images }, null, 2),
    "utf-8",
  );

  const keys = [
    ...documents.map((d) => d.storageKey),
    ...images
      .map((i) => i.url.replace(/^\/api\/media\//, ""))
      .filter((k) => k.startsWith("vehicles/")),
  ];

  let copied = 0;
  const missing: string[] = [];

  if (driver === "local") {
    const root = path.resolve(process.cwd(), process.env.STORAGE_LOCAL_DIR ?? ".data/uploads");
    for (const key of keys) {
      const to = path.join(target, "fichiers", key);
      try {
        await mkdir(path.dirname(to), { recursive: true });
        await copyFile(path.join(root, key), to);
        copied += 1;
      } catch {
        missing.push(key);
      }
    }
  } else {
    const { readStoredFile } = await import("../src/lib/storage");
    for (const key of keys) {
      const to = path.join(target, "fichiers", key);
      try {
        const buffer = await readStoredFile(key);
        await mkdir(path.dirname(to), { recursive: true });
        await writeFile(to, buffer);
        copied += 1;
      } catch {
        missing.push(key);
      }
    }
  }

  console.log(`\nSauvegarde : ${target}`);
  console.log(`  ${copied}/${keys.length} fichier(s) copié(s)`);
  console.log(`  ${documents.length} pièce(s) client, ${images.length} photo(s) de véhicule`);

  if (missing.length > 0) {
    /*
     * Un fichier référencé mais introuvable est un dossier client amputé :
     * on le signale fort plutôt que de laisser croire à une sauvegarde
     * complète.
     */
    console.error(`\n⚠️  ${missing.length} fichier(s) référencé(s) mais INTROUVABLE(S) :`);
    for (const k of missing) console.error(`     ${k}`);
    console.error("   Ces pièces manquent aux dossiers concernés.");
    process.exitCode = 1;
  }

  console.log(
    "\nCette sauvegarde contient des pièces d'identité : conservez-la\n" +
      "dans un endroit sûr, et non sur la même machine que le site.\n",
  );
}

main()
  .catch((error) => { console.error(error); process.exit(1); })
  .finally(() => db.$disconnect());
