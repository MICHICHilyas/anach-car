/**
 * Utilitaire de développement : ouvre une session pour un compte donné et
 * affiche le cookie à utiliser (tests manuels en ligne de commande).
 * Ne jamais exécuter en production.
 */
import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Ce script ouvre une session sans mot de passe : il est interdit en production.",
    );
  }

  const email = process.argv[2] ?? "admin@anachcar.ma";
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error(`Compte introuvable : ${email}`);

  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      tokenHash: createHash("sha256").update(token).digest("hex"),
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    },
  });
  console.log(token);
}

main().finally(() => db.$disconnect());
