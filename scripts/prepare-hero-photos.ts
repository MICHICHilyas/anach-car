/**
 * Harmonise des photos de véhicules avec la direction artistique du Hero.
 *
 *   npm run hero:photos
 *
 * Déposez vos photos dans brand-assets/hero-photos/ puis lancez la commande.
 * Le nom du fichier détermine le visuel remplacé :
 *
 *   economique.jpg  ->  public/images/hero/economique.webp
 *   compacte.png    ->  public/images/hero/compacte.webp
 *   berline.jpg     ->  public/images/hero/berline.webp
 *   suv.jpg         ->  public/images/hero/suv.webp
 *
 * Ce que fait le traitement, et pourquoi :
 *
 *  1. RECADRAGE en 16:9, 1600 px — le format attendu par le Hero.
 *  2. ÉTALONNAGE : légère désaturation puis voile bleu-turquoise en
 *     « soft-light ». C'est l'étape qui fait qu'une photo prise en plein
 *     soleil sur un parking et une photo prise à l'ombre appartiennent à la
 *     même série. Le soft-light déplace l'ambiance sans écraser la couleur
 *     réelle de la carrosserie : une voiture rouge reste rouge.
 *  3. VIGNETAGE : les bords s'assombrissent, le regard va sur la voiture et
 *     la photo se fond dans le bleu profond du site.
 *
 * Options :
 *   --intensity=0.55   force de l'étalonnage, entre 0 et 1 (défaut 0.55)
 *   --flip             miroir horizontal, si la voiture regarde à droite
 *                      (attention : le volant change de côté)
 */
import path from "node:path";
import { mkdir, readdir } from "node:fs/promises";
import sharp from "sharp";

const INPUT_DIR = "brand-assets/hero-photos";
const OUTPUT_DIR = "public/images/hero";
const WIDTH = 1600;
const HEIGHT = 900;

const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic"]);

function option(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return (
    process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ??
    fallback
  );
}

const intensity = Math.min(1, Math.max(0, Number(option("intensity", "0.55"))));
const flip = process.argv.includes("--flip");

/** Voile coloré : turquoise en haut à gauche, bleu profond en bas à droite. */
function ambianceLayer(): Buffer {
  const alpha = (0.85 * intensity).toFixed(3);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0e6b70" stop-opacity="${alpha}"/>
          <stop offset="0.55" stop-color="#0a3a4c" stop-opacity="${alpha}"/>
          <stop offset="1" stop-color="#061b27" stop-opacity="${alpha}"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
    </svg>`,
  );
}

/** Vignetage : centre préservé, bords assombris. */
function vignetteLayer(): Buffer {
  const edge = (0.55 * intensity).toFixed(3);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
      <defs>
        <radialGradient id="v" cx="0.52" cy="0.5" r="0.75">
          <stop offset="0.35" stop-color="#ffffff" stop-opacity="1"/>
          <stop offset="1" stop-color="#04151f" stop-opacity="${edge}"/>
        </radialGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#v)"/>
    </svg>`,
  );
}

async function main() {
  const inputPath = path.resolve(process.cwd(), INPUT_DIR);
  await mkdir(inputPath, { recursive: true });
  await mkdir(path.resolve(process.cwd(), OUTPUT_DIR), { recursive: true });

  const files = (await readdir(inputPath)).filter((file) =>
    SUPPORTED.has(path.extname(file).toLowerCase()),
  );

  if (files.length === 0) {
    console.info(`
Aucune photo trouvée dans ${INPUT_DIR}/

Déposez-y vos photos, nommées d'après la catégorie qu'elles illustrent :
  economique.jpg · compacte.jpg · berline.jpg · suv.jpg

Cadrage conseillé : format paysage, voiture décalée à DROITE du cadre,
vue trois-quarts avant. Le côté gauche restera vide pour le texte.
`);
    return;
  }

  console.info(
    `Étalonnage à ${Math.round(intensity * 100)} %${flip ? " · miroir horizontal" : ""}\n`,
  );

  const ambiance = ambianceLayer();
  const vignette = vignetteLayer();

  for (const file of files) {
    const name = path.basename(file, path.extname(file)).toLowerCase();
    const source = sharp(path.join(inputPath, file)).rotate(); // respecte l'EXIF
    const original = await source.metadata();

    let pipeline = source
      .resize({
        width: WIDTH,
        height: HEIGHT,
        fit: "cover",
        // `attention` recadre autour de la zone la plus contrastée :
        // sur une photo de voiture, c'est la voiture.
        position: sharp.strategy.attention,
      })
      .modulate({ saturation: 1 - 0.18 * intensity, brightness: 1 - 0.06 * intensity });

    if (flip) pipeline = pipeline.flop();

    await pipeline
      .composite([
        { input: ambiance, blend: "soft-light" },
        { input: vignette, blend: "multiply" },
      ])
      .webp({ quality: 82, effort: 6 })
      .toFile(path.resolve(process.cwd(), OUTPUT_DIR, `${name}.webp`));

    const result = await sharp(
      path.resolve(process.cwd(), OUTPUT_DIR, `${name}.webp`),
    ).metadata();

    console.info(
      `  ${file.padEnd(24)} ${original.width}×${original.height}` +
        `  ->  ${name}.webp  ${result.width}×${result.height}` +
        `  (${Math.round((result.size ?? 0) / 1024)} Ko)`,
    );
  }

  console.info(`
Terminé. Rechargez la page d'accueil pour voir le résultat.

Si l'ambiance est trop marquée ou pas assez :
  npm run hero:photos -- --intensity=0.35
`);
}

main().catch((error) => {
  console.error(`\nErreur : ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
