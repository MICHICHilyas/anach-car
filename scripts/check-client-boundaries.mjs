/**
 * Détecte les fonctions de modules "use client" appelées depuis le serveur.
 *
 *   npm run check:boundaries
 *
 * React interdit d'invoquer une fonction exportée par un module client depuis
 * un composant serveur : elle ne peut qu'être rendue comme composant ou
 * passée en props. La violation ne se voit ni au typage ni au build — elle
 * n'apparaît qu'à l'exécution, sur la page concernée. D'où ce contrôle.
 */
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import path from "node:path";

const files = globSync("src/**/*.{ts,tsx}", { cwd: process.cwd() }).filter(
  (file) => !file.includes("/generated/"),
);

const read = (file) => readFileSync(path.resolve(file), "utf8");
const isClient = (source) => /^\s*["']use client["']/m.test(source.slice(0, 400));

// 1. Exports de chaque module client, hors composants (majuscule initiale).
const clientExports = new Map(); // chemin d'import -> Set(noms)

for (const file of files) {
  const source = read(file);
  if (!isClient(source)) continue;

  const names = new Set();
  const patterns = [
    /export\s+(?:async\s+)?function\s+([a-z][A-Za-z0-9_]*)/g,
    /export\s+const\s+([a-z][A-Za-z0-9_]*)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) names.add(match[1]);
  }
  if (names.size === 0) continue;

  const alias = "@/" + file.replace(/^src\//, "").replace(/\.tsx?$/, "");
  clientExports.set(alias, names);
}

// 2. Modules serveur qui les importent ET les appellent.
const problems = [];

for (const file of files) {
  const source = read(file);
  if (isClient(source)) continue;

  for (const [alias, names] of clientExports) {
    const importRe = new RegExp(
      `import\\s+(type\\s+)?\\{([^}]+)\\}\\s+from\\s+["']${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
      "g",
    );
    for (const match of source.matchAll(importRe)) {
      if (match[1]) continue; // `import type` : effacé à la compilation
      for (const raw of match[2].split(",")) {
        const name = raw.trim().split(/\s+as\s+/)[0].trim();
        if (!names.has(name)) continue;
        // Appelée comme une fonction ?
        if (new RegExp(`\\b${name}\\s*\\(`).test(source)) {
          problems.push({ file, alias, name });
        }
      }
    }
  }
}

if (problems.length === 0) {
  console.log(
    `Aucune violation. ${clientExports.size} module(s) client exportant des fonctions ont été vérifiés.`,
  );
  process.exit(0);
}

console.error("Fonctions de modules client appelées depuis le serveur :\n");
for (const { file, alias, name } of problems) {
  console.error(`  ${file}`);
  console.error(`    appelle ${name}() importé de ${alias} ("use client")\n`);
}
console.error(
  "Déplacez ces fonctions dans un module sans directive \"use client\".\n",
);
process.exit(1);
