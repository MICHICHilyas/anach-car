/**
 * Création d'un compte pour l'espace agence.
 *
 *   npm run create-admin
 *   npm run create-admin -- --email=gerant@anachcar.ma --name="Gérant" --role=MANAGER
 *
 * Sans argument, le script demande les informations de façon interactive.
 * Le mot de passe n'est jamais affiché en clair dans l'historique du shell
 * s'il est saisi de manière interactive.
 */
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const ROLES = ["ADMIN", "MANAGER", "EMPLOYEE"] as const;
type Role = (typeof ROLES)[number];

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const email = (
      argValue("email") ?? (await rl.question("Adresse email : "))
    )
      .trim()
      .toLowerCase();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("Adresse email invalide.");
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error(
        `Un compte existe déjà avec cette adresse (${existing.name}). ` +
          "Utilisez une autre adresse ou supprimez le compte existant.",
      );
    }

    const name = (argValue("name") ?? (await rl.question("Nom complet : "))).trim();
    if (name.length < 2) throw new Error("Le nom est obligatoire.");

    const roleInput = (
      argValue("role") ??
      (await rl.question("Rôle [ADMIN / MANAGER / EMPLOYEE] (ADMIN) : "))
    )
      .trim()
      .toUpperCase();
    const role: Role = (ROLES as readonly string[]).includes(roleInput)
      ? (roleInput as Role)
      : "ADMIN";

    const password = argValue("password") ?? (await rl.question("Mot de passe : "));
    if (password.length < 8) {
      throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
    }

    const user = await db.user.create({
      data: {
        email,
        name,
        role,
        passwordHash: await bcrypt.hash(password, 12),
      },
    });

    console.log(`
Compte créé.

  Nom    : ${user.name}
  Email  : ${user.email}
  Rôle   : ${user.role}

Connexion : ${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/admin/login
`);
  } finally {
    rl.close();
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(`\nErreur : ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
