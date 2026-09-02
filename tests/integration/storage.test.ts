import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import path from "node:path";

/**
 * Chaîne de stockage des fichiers : écriture, relecture, suppression et
 * garde-fous (type MIME, taille, clé). Les documents clients étant des
 * pièces d'identité, ces contrôles sont de la sécurité, pas du confort.
 */
const TEST_DIR = ".data/test-uploads";

beforeAll(() => {
  process.env.STORAGE_DRIVER = "local";
  process.env.STORAGE_LOCAL_DIR = TEST_DIR;
});

afterAll(async () => {
  await rm(path.resolve(process.cwd(), TEST_DIR), {
    recursive: true,
    force: true,
  });
});

function fakeFile(
  name: string,
  type: string,
  bytes = 64,
): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("stockage des fichiers", () => {
  it("écrit puis relit une photo de véhicule", async () => {
    const { putFile, readStoredFile } = await import("@/lib/storage");

    const stored = await putFile(fakeFile("clio.jpg", "image/jpeg", 128), "vehicles");

    expect(stored.key).toMatch(/^vehicles\/[a-f0-9-]+\.jpg$/);
    expect(stored.url).toBe(`/api/media/${stored.key}`);
    expect(stored.size).toBe(128);

    const buffer = await readStoredFile(stored.key);
    expect(buffer.byteLength).toBe(128);
  });

  it("range les documents dans un dossier distinct des photos", async () => {
    const { putFile } = await import("@/lib/storage");
    const stored = await putFile(fakeFile("cin.pdf", "application/pdf"), "documents");

    expect(stored.key.startsWith("documents/")).toBe(true);
  });

  it("supprime un fichier sans échouer si on recommence", async () => {
    const { putFile, deleteStoredFile, readStoredFile } = await import("@/lib/storage");

    const stored = await putFile(fakeFile("a.png", "image/png"), "vehicles");
    await deleteStoredFile(stored.key);

    await expect(readStoredFile(stored.key)).rejects.toThrow();
    // Une seconde suppression ne doit pas lever d'exception.
    await expect(deleteStoredFile(stored.key)).resolves.toBeUndefined();
  });

  it("refuse un exécutable déguisé en photo", async () => {
    const { assertUploadAllowed } = await import("@/lib/storage");

    expect(() =>
      assertUploadAllowed(fakeFile("virus.exe", "application/x-msdownload"), "vehicles"),
    ).toThrow(/Format de fichier non autorisé/);
  });

  it("refuse un PDF comme photo de véhicule, mais l'accepte comme document", async () => {
    const { assertUploadAllowed } = await import("@/lib/storage");

    expect(() =>
      assertUploadAllowed(fakeFile("doc.pdf", "application/pdf"), "vehicles"),
    ).toThrow();
    expect(() =>
      assertUploadAllowed(fakeFile("doc.pdf", "application/pdf"), "documents"),
    ).not.toThrow();
  });

  it("refuse un fichier trop volumineux ou vide", async () => {
    const { assertUploadAllowed } = await import("@/lib/storage");

    expect(() =>
      assertUploadAllowed(
        fakeFile("enorme.jpg", "image/jpeg", 7 * 1024 * 1024),
        "vehicles",
      ),
    ).toThrow(/trop volumineux/);

    expect(() =>
      assertUploadAllowed(fakeFile("vide.jpg", "image/jpeg", 0), "vehicles"),
    ).toThrow(/vide/);
  });

  it("ne donne jamais d'URL publique à un document, même en vercel-blob", async () => {
    const { publicUrl } = await import("@/lib/storage");
    const previous = process.env.STORAGE_DRIVER;

    try {
      for (const value of ["local", "vercel-blob"]) {
        process.env.STORAGE_DRIVER = value;
        const url = publicUrl("documents/abcd.pdf");

        // La route vérifie la session et journalise chaque consultation :
        // une URL de CDN court-circuiterait les deux.
        expect(url).toBe("/api/media/documents/abcd.pdf");
        expect(url.startsWith("http")).toBe(false);
      }
    } finally {
      process.env.STORAGE_DRIVER = previous;
    }
  });

  it("sert les photos de véhicules par la route média, pas par une URL devinée", async () => {
    const { publicUrl } = await import("@/lib/storage");

    // L'URL CDN réelle est celle renvoyée à l'écriture et stockée en base ;
    // on ne la reconstruit jamais depuis la clé.
    expect(publicUrl("vehicles/abcd.jpg")).toBe("/api/media/vehicles/abcd.jpg");
  });

  it("remonte une panne de suppression au lieu de l'ignorer", async () => {
    const { deleteStoredFile } = await import("@/lib/storage");
    const previous = process.env.STORAGE_LOCAL_DIR;

    try {
      // Un fichier simplement absent ne doit pas lever : la ligne en base
      // peut partir sans risque de laisser un orphelin.
      await expect(
        deleteStoredFile("vehicles/inexistant.jpg"),
      ).resolves.toBeUndefined();

      // En revanche, si le dossier de stockage est en fait un fichier, la
      // suppression échoue vraiment : masquer l'erreur ferait disparaître la
      // référence d'une pièce d'identité toujours stockée.
      const { writeFile, mkdir } = await import("node:fs/promises");
      const blocked = path.resolve(process.cwd(), TEST_DIR, "bloque");
      await mkdir(path.dirname(blocked), { recursive: true });
      await writeFile(blocked, "");
      process.env.STORAGE_LOCAL_DIR = path.join(TEST_DIR, "bloque");

      await expect(deleteStoredFile("vehicles/x.jpg")).rejects.toThrow();
    } finally {
      process.env.STORAGE_LOCAL_DIR = previous;
    }
  });

  it("refuse de lire une clé qui tente de remonter l'arborescence", async () => {
    const { readStoredFile } = await import("@/lib/storage");

    await expect(readStoredFile("vehicles/../../.env")).rejects.toThrow(
      /Clé de fichier invalide/,
    );
  });
});
