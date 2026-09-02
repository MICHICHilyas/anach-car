import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Stockage des fichiers, derrière une interface unique.
 *
 * - `local`       : disque, dans un dossier HORS de public/ (défaut en dev).
 * - `vercel-blob` : stockage objet, adapté à la production sur Vercel.
 *
 * Aucun fichier n'est jamais déposé dans public/ : les photos de véhicules
 * passent par /api/media/[...key] et les documents clients par une route
 * protégée par session. Un document sensible ne peut donc pas fuir via une
 * URL devinée.
 */

export type Folder = "vehicles" | "documents";

export type StoredFile = {
  key: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
};

const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const DOCUMENT_MIME = [...IMAGE_MIME, "application/pdf"];

export const UPLOAD_LIMITS = {
  vehicles: { maxBytes: 6 * 1024 * 1024, mime: IMAGE_MIME },
  documents: { maxBytes: 10 * 1024 * 1024, mime: DOCUMENT_MIME },
} satisfies Record<Folder, { maxBytes: number; mime: string[] }>;

const localRoot = () =>
  path.resolve(process.cwd(), process.env.STORAGE_LOCAL_DIR ?? ".data/uploads");

const driver = () => process.env.STORAGE_DRIVER ?? "local";

/** Empêche toute remontée d'arborescence via une clé forgée (`../../.env`). */
const KEY_PATTERN = /^(vehicles|documents)\/[A-Za-z0-9_-]+\.[A-Za-z0-9]{1,5}$/;

export function isValidKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

function extensionFor(file: File): string {
  const fromName = path.extname(file.name).replace(".", "").toLowerCase();
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "application/pdf": "pdf",
  };
  return map[file.type] ?? "bin";
}

export function assertUploadAllowed(file: File, folder: Folder): void {
  const limit = UPLOAD_LIMITS[folder];
  if (!limit.mime.includes(file.type)) {
    throw new Error(
      `Format de fichier non autorisé (${file.type || "inconnu"}). Formats acceptés : ${limit.mime
        .map((m) => m.split("/")[1])
        .join(", ")}.`,
    );
  }
  if (file.size > limit.maxBytes) {
    throw new Error(
      `Fichier trop volumineux (${Math.round(file.size / 1024 / 1024)} Mo). Maximum : ${Math.round(
        limit.maxBytes / 1024 / 1024,
      )} Mo.`,
    );
  }
  if (file.size === 0) throw new Error("Le fichier est vide.");
}

export async function putFile(
  file: File,
  folder: Folder,
): Promise<StoredFile> {
  assertUploadAllowed(file, folder);

  const key = `${folder}/${randomUUID()}.${extensionFor(file)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (driver() === "vercel-blob") {
    const { put } = await import("@vercel/blob");

    /*
     * Deux niveaux d'accès, et la distinction est capitale :
     *
     *  - `public`  : les photos de véhicules, servies directement par le CDN ;
     *  - `private` : les pièces d'identité, qui n'ont AUCUNE URL exploitable.
     *
     * Un fichier privé ne se lit qu'avec le jeton du magasin (voir
     * `readStoredFile`), donc uniquement depuis le serveur, après contrôle de
     * session. Même l'URL exacte ne suffit pas à l'ouvrir.
     */
    const blob = await put(key, buffer, {
      access: isPublicFolder(folder) ? "public" : "private",
      contentType: file.type,
      addRandomSuffix: false,
    });

    return {
      key,
      // Les documents ne reçoivent jamais d'URL directe : leur lecture passe
      // par la route authentifiée, qui journalise chaque consultation.
      url: isPublicFolder(folder) ? blob.url : publicUrl(key),
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    };
  }

  const target = path.join(localRoot(), key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);

  return {
    key,
    url: publicUrl(key),
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
  };
}

export async function readStoredFile(key: string): Promise<Buffer> {
  if (!isValidKey(key)) throw new Error("Clé de fichier invalide.");

  if (driver() === "vercel-blob") {
    const { get } = await import("@vercel/blob");

    /*
     * `get` s'authentifie avec le jeton du magasin : c'est le seul moyen de
     * lire un fichier privé. L'ancienne version faisait un simple `fetch` sur
     * l'URL publique — ce qui n'aurait jamais fonctionné pour une pièce
     * d'identité, et aurait signifié qu'elle était accessible sans jeton.
     */
    const result = await get(key, {
      access: isPublicFolder(folderOf(key)) ? "public" : "private",
    });
    if (!result?.stream) throw new Error("Fichier introuvable.");

    // `stream` est un ReadableStream web : on le vide via son lecteur.
    const reader = result.stream.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks);
  }

  return readFile(path.join(localRoot(), key));
}

export async function deleteStoredFile(key: string): Promise<void> {
  if (!isValidKey(key)) return;
  try {
    if (driver() === "vercel-blob") {
      const { del } = await import("@vercel/blob");
      // `del` accepte le chemin du fichier ; inutile de reconstruire une URL.
      await del(key);
      return;
    }
    await unlink(path.join(localRoot(), key));
  } catch (error) {
    /*
     * Un fichier déjà absent n'est pas une erreur : la ligne en base peut
     * partir. Toute autre panne, en revanche, doit remonter — sinon on
     * supprimerait la référence d'une pièce d'identité qui, elle, resterait
     * bel et bien stockée, sans plus aucun moyen de la retrouver.
     */
    if (!isMissingFileError(error)) throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  if ((error as { code?: string } | null)?.code === "ENOENT") return true;
  // @vercel/blob lève une BlobNotFoundError, identifiée par son nom.
  return (error as { name?: string } | null)?.name === "BlobNotFoundError";
}

/**
 * URL de lecture. Les photos de véhicules sont publiques ; les documents
 * n'ont jamais d'URL publique et passent par la route admin authentifiée.
 */
export function publicUrl(key: string): string {
  /*
   * Toujours une URL interne, pour les deux pilotes.
   *
   * Pour un document, c'est une exigence : la route vérifie la session et
   * journalise l'accès. Pour une photo de véhicule, l'URL CDN directe est
   * renvoyée à l'écriture (`putFile`) et enregistrée dans `VehicleImage.url` ;
   * on ne cherche donc jamais à la reconstruire ici, ce qui supposerait de
   * connaître le domaine du magasin.
   */
  return `/api/media/${key}`;
}

/** Seules les photos de véhicules sont servies publiquement. */
function isPublicFolder(folder: Folder | null): boolean {
  return folder === "vehicles";
}

/** Déduit le dossier depuis une clé (« documents/abc.pdf » -> « documents »). */
function folderOf(key: string): Folder | null {
  const prefix = key.split("/")[0];
  return prefix === "vehicles" || prefix === "documents" ? prefix : null;
}
