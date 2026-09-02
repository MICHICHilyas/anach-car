import "dotenv/config";
import { execSync } from "node:child_process";
import { Client } from "pg";

/**
 * Prépare une base de test isolée.
 *
 * On ne teste JAMAIS sur la base de développement : les tests créent et
 * suppriment des réservations, ce qui détruirait les données de l'agence.
 * La base `anach_car_test` est créée à la volée puis migrée.
 */
const TEST_DB = "anach_car_test";

export default async function setup() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error(
      "DATABASE_URL est manquant : lancez `docker compose up -d` puis copiez .env.example vers .env.",
    );
  }

  const url = new URL(baseUrl);
  const adminUrl = new URL(baseUrl);
  adminUrl.pathname = "/postgres";

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  const exists = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [TEST_DB],
  );
  if (exists.rowCount === 0) {
    await client.query(`CREATE DATABASE "${TEST_DB}"`);
  }
  await client.end();

  url.pathname = `/${TEST_DB}`;
  const testUrl = url.toString();
  process.env.TEST_DATABASE_URL = testUrl;

  // Applique le schéma (idempotent : les migrations déjà passées sont ignorées).
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: testUrl },
  });
}
