import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/setup/global-setup.ts"],
    include: ["tests/**/*.test.ts"],
    // Les tests d'intégration partagent une base : on les exécute en série
    // pour éviter que deux fichiers ne se marchent dessus.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // Neutralise la garde `server-only` hors du runtime Next.js.
      "server-only": path.resolve(import.meta.dirname, "./tests/setup/server-only-stub.ts"),
    },
  },
});
