/**
 * Prépare les déclinaisons du logo à partir du fichier fourni par l'agence.
 *
 *   npm run brand
 *
 * Source attendue : brand-assets/logo-anach-car-source.png
 * (le fichier original, non servi au public — il est trop lourd pour le web).
 *
 * Produit :
 *   public/brand/anach-car-logo.png        fond clair (en-tête, connexion, contrat)
 *   public/brand/anach-car-logo-white.png  fond sombre (pied de page, sidebar)
 *   public/brand/anach-car-mark.png        pictogramme seul (favicon, réseaux)
 *   public/favicon.png                     onglet du navigateur
 *
 * Relancer ce script après tout changement de logo.
 */
import path from "node:path";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const SOURCE = "brand-assets/logo-anach-car-source.png";
const OUT_DIR = "public/brand";

/** Un pixel est considéré comme fond si ses trois canaux frôlent le blanc. */
const BACKGROUND_THRESHOLD = 248;
/** Hauteur des logos exportés (2× la taille d'affichage, pour les écrans Retina). */
const LOGO_HEIGHT = 160;

type Raw = { data: Buffer; width: number; height: number; channels: number };

async function main() {
  const sourcePath = path.resolve(process.cwd(), SOURCE);
  const image = sharp(sourcePath).ensureAlpha();
  const meta = await image.metadata();
  console.info(`Source : ${meta.width} × ${meta.height} px`);

  const raw = (await image
    .raw()
    .toBuffer({ resolveWithObject: true })) as unknown as {
    data: Buffer;
    info: { width: number; height: number; channels: number };
  };
  const source: Raw = { data: raw.data, ...raw.info };

  // 1. Retirer les marges blanches ----------------------------------------
  const box = contentBox(source);
  console.info(
    `Contenu utile : ${box.width} × ${box.height} px ` +
      `(marges retirées : ${box.left} px à gauche, ${box.top} px en haut)`,
  );

  // 2. Fond transparent, couleurs d'origine restituées ---------------------
  const onLight = extractAlpha(source, box, "keep");
  const onDark = extractAlpha(source, box, "invert");

  await mkdir(path.resolve(process.cwd(), OUT_DIR), { recursive: true });

  await write(onLight, `${OUT_DIR}/anach-car-logo.png`, LOGO_HEIGHT);
  await write(onDark, `${OUT_DIR}/anach-car-logo-white.png`, LOGO_HEIGHT);

  // Version compacte : voiture + nom, sans la baseline.
  // Dans un en-tête de 72 px, « LOCATION DE VOITURES » ne ferait que 5 px de
  // haut — illisible, et visuellement bruyant. Le nom gagne 40 % de taille.
  const compactHeight = Math.round(onLight.height * 0.83);
  const compactLight = crop(onLight, {
    left: 0,
    top: 0,
    width: onLight.width,
    height: compactHeight,
  });
  const compactDark = crop(onDark, {
    left: 0,
    top: 0,
    width: onDark.width,
    height: compactHeight,
  });
  await write(
    crop(compactLight, opaqueBox(compactLight)),
    `${OUT_DIR}/anach-car-logo-compact.png`,
    LOGO_HEIGHT,
  );
  await write(
    crop(compactDark, opaqueBox(compactDark)),
    `${OUT_DIR}/anach-car-logo-compact-white.png`,
    LOGO_HEIGHT,
  );

  // 3. Pictogramme seul : la voiture, au-dessus du texte -------------------
  //    Il occupe le tiers supérieur du logo complet.
  const markStrip = crop(onDark, {
    left: 0,
    top: 0,
    width: onDark.width,
    height: Math.round(onDark.height * 0.42),
  });
  // La voiture est centrée : on retire les marges latérales vides.
  const mark = crop(markStrip, opaqueBox(markStrip));
  await write(mark, `${OUT_DIR}/anach-car-mark.png`, 128);

  // 4. Favicon : le pictogramme sur le bleu profond de la marque -----------
  const markPng = await sharp(mark.data, {
    raw: { width: mark.width, height: mark.height, channels: 4 },
  })
    .resize({ width: 228, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 256,
      height: 256,
      channels: 4,
      background: { r: 6, g: 27, b: 39, alpha: 1 },
    },
  })
    .composite([{ input: markPng, gravity: "center" }])
    .png()
    .toFile(path.resolve(process.cwd(), "public/favicon.png"));

  console.info("\nFichiers générés :");
  for (const file of [
    `${OUT_DIR}/anach-car-logo.png`,
    `${OUT_DIR}/anach-car-logo-white.png`,
    `${OUT_DIR}/anach-car-logo-compact.png`,
    `${OUT_DIR}/anach-car-logo-compact-white.png`,
    `${OUT_DIR}/anach-car-mark.png`,
    "public/favicon.png",
  ]) {
    const info = await sharp(path.resolve(process.cwd(), file)).metadata();
    console.info(`  ${file.padEnd(38)} ${info.width} × ${info.height} px`);
  }
}

/** Boîte englobant les pixels non blancs, avec une marge de respiration. */
function contentBox(raw: Raw) {
  const { data, width, height, channels } = raw;
  let top = height;
  let left = width;
  let right = 0;
  let bottom = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      const min = Math.min(data[i], data[i + 1], data[i + 2]);
      if (min < BACKGROUND_THRESHOLD) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  const padding = Math.round((right - left) * 0.015);
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding);
  bottom = Math.min(height - 1, bottom + padding);

  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/**
 * Détoure le logo.
 *
 * Le fichier fourni est un logo sombre sur fond blanc : l'opacité de chaque
 * pixel se déduit de son écart au blanc (`255 - min(r,g,b)`). La couleur est
 * ensuite « démultipliée » pour retrouver la teinte réelle — sans cette
 * étape, les bords lissés laisseraient un halo blanchâtre.
 *
 * En mode `invert`, les parties neutres (le noir du mot « CAR », la
 * baseline) deviennent blanches pour rester lisibles sur fond sombre, tandis
 * que le turquoise de la marque est simplement éclairci.
 */
function extractAlpha(
  raw: Raw,
  box: { left: number; top: number; width: number; height: number },
  mode: "keep" | "invert",
): Raw {
  const { data, width, channels } = raw;
  const out = Buffer.alloc(box.width * box.height * 4);

  for (let y = 0; y < box.height; y += 1) {
    for (let x = 0; x < box.width; x += 1) {
      const i = ((y + box.top) * width + (x + box.left)) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const min = Math.min(r, g, b);
      const max = Math.max(r, g, b);
      const alpha = 255 - min;
      const o = (y * box.width + x) * 4;

      if (alpha <= 2) {
        out[o] = 0;
        out[o + 1] = 0;
        out[o + 2] = 0;
        out[o + 3] = 0;
        continue;
      }

      // Démultiplication : couleur réelle du trait sous le lissage.
      const c = alpha / 255;
      const unpremultiply = (v: number) =>
        clamp(Math.round((v - 255 * (1 - c)) / c), 0, 255);

      let red = unpremultiply(r);
      let green = unpremultiply(g);
      let blue = unpremultiply(b);

      if (mode === "invert") {
        const saturation = max - min;
        if (saturation < 30) {
          // Neutre (noir, gris) -> blanc.
          red = 255;
          green = 255;
          blue = 255;
        } else {
          // Turquoise : éclairci de 40 % pour tenir sur le bleu profond.
          red = clamp(Math.round(red + (255 - red) * 0.4), 0, 255);
          green = clamp(Math.round(green + (255 - green) * 0.4), 0, 255);
          blue = clamp(Math.round(blue + (255 - blue) * 0.4), 0, 255);
        }
      }

      out[o] = red;
      out[o + 1] = green;
      out[o + 2] = blue;
      out[o + 3] = alpha;
    }
  }

  return { data: out, width: box.width, height: box.height, channels: 4 };
}

/** Boîte englobant les pixels visibles d'un calque RGBA. */
function opaqueBox(raw: Raw) {
  const { data, width, height } = raw;
  let top = height;
  let left = width;
  let right = 0;
  let bottom = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 12) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function crop(
  raw: Raw,
  box: { left: number; top: number; width: number; height: number },
): Raw {
  const out = Buffer.alloc(box.width * box.height * 4);
  for (let y = 0; y < box.height; y += 1) {
    const from = ((y + box.top) * raw.width + box.left) * 4;
    raw.data.copy(out, y * box.width * 4, from, from + box.width * 4);
  }
  return { data: out, width: box.width, height: box.height, channels: 4 };
}

async function write(raw: Raw, file: string, height: number) {
  await sharp(raw.data, {
    raw: { width: raw.width, height: raw.height, channels: 4 },
  })
    .resize({ height, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.resolve(process.cwd(), file));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

main().catch((error) => {
  console.error(`\nErreur : ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
