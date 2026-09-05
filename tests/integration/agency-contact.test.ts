import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, resetDatabase } from "../setup/db";

/**
 * Les coordonnées saisies dans /admin/parametres doivent se propager au site
 * public. L'écran de paramètres promet « Affichées sur le site, dans les
 * emails et les liens WhatsApp » : ces tests vérifient que la promesse est
 * tenue, y compris pour les liens cliquables.
 */
const db = createTestDb();

vi.mock("@/lib/db", async () => {
  const { createTestDb } = await import("../setup/db");
  return { db: createTestDb() };
});

beforeEach(async () => {
  await resetDatabase(db);
});

describe("coordonnées effectives de l'agence", () => {
  it("retombe sur la configuration tant que rien n'a été saisi", async () => {
    const { DEFAULT_SETTINGS } = await import("@/lib/settings");
    const { AGENCY } = await import("@/config/agency");

    /*
     * On interroge les valeurs par défaut plutôt que `getAgencyContact` :
     * cette dernière est mémoïsée par requête (`cache()` de React), si bien
     * qu'au sein d'un même fichier de test elle renverrait la valeur lue par
     * un cas précédent. La mémoïsation est voulue en production — un rendu
     * appelle la fonction une dizaine de fois — mais elle rendrait ici
     * l'ordre des tests significatif, donc le résultat trompeur.
     */
    expect(DEFAULT_SETTINGS.agency.mobile).toBe(AGENCY.phone.mobile);
    expect(DEFAULT_SETTINGS.agency.email).toBe(AGENCY.email);
  });

  it("propage un changement de numéro et d'email", async () => {
    const { updateSettings, getAgencyContact, getSettings } = await import(
      "@/lib/settings"
    );

    await updateSettings({
      agency: {
        ...(await getSettings()).agency,
        mobile: "+212 6 00 11 22 33",
        email: "nouveau@anachcar.ma",
      },
    });

    const contact = await getAgencyContact();

    expect(contact.mobile).toBe("+212 6 00 11 22 33");
    expect(contact.email).toBe("nouveau@anachcar.ma");
  });

  it("dérive un numéro composable du numéro affiché", async () => {
    const { updateSettings, getAgencyContact, getSettings } = await import(
      "@/lib/settings"
    );

    await updateSettings({
      agency: { ...(await getSettings()).agency, mobile: "+212 6 61 80 58 08" },
    });

    // Un lien tel: ne tolère ni espaces ni ponctuation : sans cette
    // dérivation, appuyer sur le numéro depuis un mobile ne compose rien.
    expect((await getAgencyContact()).mobileHref).toBe("+212661805808");
  });
});
