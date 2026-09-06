/**
 * Réduit une image dans le navigateur avant de l'envoyer au serveur.
 *
 * Un téléphone récent produit des photos de 3 à 5 Mo. Deux pièces d'identité
 * dépassaient la taille maximale d'une requête, et la réservation échouait
 * sans laisser de trace — le client voyait « une erreur est survenue » sans
 * comprendre pourquoi, et l'agence perdait la demande.
 *
 * Une CIN reste parfaitement lisible en 1600 px de large : on redimensionne
 * et on réencode en JPEG. Une photo de 4 Mo tombe ainsi sous les 500 Ko, ce
 * qui accélère aussi l'envoi sur la 4G d'Agadir.
 *
 * Ce module s'exécute côté navigateur uniquement (canvas). En cas d'échec —
 * format exotique, mémoire insuffisante — on renvoie le fichier d'origine :
 * mieux vaut une image lourde qu'un envoi impossible.
 */
const MAX_EDGE = 1600;
const QUALITY = 0.82;
/** En deçà, la compression n'apporterait rien. */
const SKIP_BELOW_BYTES = 400 * 1024;

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file; // un PDF passe tel quel
  if (file.size <= SKIP_BELOW_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // Mieux vaut envoyer l'original que bloquer la réservation.
    return file;
  }
}
