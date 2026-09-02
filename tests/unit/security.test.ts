import { beforeAll, describe, expect, it } from "vitest";
import { isValidKey } from "@/lib/storage";

/**
 * Garde-fous de sécurité vérifiables sans base de données.
 */
describe("clés de fichiers", () => {
  it("accepte une clé légitime", () => {
    expect(isValidKey("vehicles/3f2a1b4c-1111-2222-3333-444455556666.jpg")).toBe(true);
    expect(isValidKey("documents/3f2a1b4c-1111-2222-3333-444455556666.pdf")).toBe(true);
  });

  it("refuse toute tentative de remontée d'arborescence", () => {
    expect(isValidKey("vehicles/../../.env")).toBe(false);
    expect(isValidKey("../.env")).toBe(false);
    expect(isValidKey("/etc/passwd")).toBe(false);
    expect(isValidKey("vehicles/sub/dir/file.jpg")).toBe(false);
  });

  it("refuse un dossier non autorisé", () => {
    expect(isValidKey("secrets/file.pdf")).toBe(false);
  });
});

describe("jetons de consultation des réservations", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "secret-de-test-suffisamment-long-0123456789";
  });

  it("valide uniquement le jeton correspondant à la référence", async () => {
    const { signReference, verifyReferenceToken } = await import("@/lib/tokens");

    const token = signReference("AC-2026-00124");
    expect(verifyReferenceToken("AC-2026-00124", token)).toBe(true);

    // Un client ne peut pas lire la réservation du voisin en incrémentant le numéro.
    expect(verifyReferenceToken("AC-2026-00125", token)).toBe(false);
    expect(verifyReferenceToken("AC-2026-00124", "faux-jeton")).toBe(false);
    expect(verifyReferenceToken("AC-2026-00124", undefined)).toBe(false);
  });
});
