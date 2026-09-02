import "server-only";
import { db } from "@/lib/db";
import { assertUploadAllowed, putFile } from "@/lib/storage";
import { DocumentType } from "@/generated/prisma/enums";

/**
 * Enregistrement des pièces d'identité d'un client.
 *
 * Utilisé aussi bien par le formulaire public que par la saisie au comptoir.
 * Les fichiers sont rattachés au CLIENT et à la RÉSERVATION : au client pour
 * qu'il n'ait pas à les redonner à sa prochaine location, à la réservation
 * pour savoir de quel dossier ils proviennent.
 */
export type IdentityDocuments = {
  cin?: File | null;
  license?: File | null;
};

/** Champs de formulaire associés, pour renvoyer l'erreur au bon endroit. */
export const DOCUMENT_FIELDS = {
  cin: "cinFile",
  license: "licenseFile",
} as const;

/**
 * Contrôle format et taille AVANT toute écriture sur disque.
 * Renvoie les erreurs par champ, ou un objet vide si tout est valide.
 */
export function validateIdentityDocuments(
  documents: IdentityDocuments | undefined,
  options: { required?: boolean } = {},
): Record<string, string> {
  const errors: Record<string, string> = {};
  const cin = documents?.cin ?? null;
  const license = documents?.license ?? null;

  if (options.required) {
    if (!cin) {
      errors[DOCUMENT_FIELDS.cin] =
        "La photo de la CIN ou du passeport est obligatoire.";
    }
    if (!license) {
      errors[DOCUMENT_FIELDS.license] =
        "La photo du permis de conduire est obligatoire.";
    }
  }

  for (const [key, file] of [
    [DOCUMENT_FIELDS.cin, cin],
    [DOCUMENT_FIELDS.license, license],
  ] as const) {
    if (!file || errors[key]) continue;
    try {
      assertUploadAllowed(file, "documents");
    } catch (error) {
      errors[key] = error instanceof Error ? error.message : "Fichier invalide.";
    }
  }

  return errors;
}

/**
 * Écrit les fichiers et crée les lignes correspondantes.
 *
 * Un échec d'écriture n'annule jamais la réservation : l'agence réclamera la
 * pièce manquante. On renvoie le nombre de pièces effectivement conservées.
 */
export async function storeIdentityDocuments(params: {
  customerId: string;
  reservationId: string;
  documents: IdentityDocuments | undefined;
  /** Renseigné quand un employé dépose les pièces depuis le dashboard. */
  uploadedById?: string | null;
  source: "site" | "comptoir";
}): Promise<number> {
  const origin =
    params.source === "site" ? "transmis à la réservation" : "remis au comptoir";

  const entries = [
    params.documents?.cin
      ? {
          file: params.documents.cin,
          type: DocumentType.CIN,
          title: `CIN / passeport (${origin})`,
        }
      : null,
    params.documents?.license
      ? {
          file: params.documents.license,
          type: DocumentType.DRIVER_LICENSE,
          title: `Permis de conduire (${origin})`,
        }
      : null,
  ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  let stored = 0;
  for (const entry of entries) {
    try {
      const file = await putFile(entry.file, "documents");
      await db.document.create({
        data: {
          type: entry.type,
          title: entry.title,
          fileName: entry.file.name,
          storageKey: file.key,
          mimeType: entry.file.type,
          size: entry.file.size,
          customerId: params.customerId,
          reservationId: params.reservationId,
          uploadedById: params.uploadedById ?? null,
        },
      });
      stored += 1;
    } catch (error) {
      console.error("[documents] pièce justificative non enregistrée", error);
    }
  }
  return stored;
}
