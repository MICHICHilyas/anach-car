import "server-only";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Numérotation des réservations (AC-2026-00124) et des véhicules (AC-V-012).
 *
 * Le compteur est incrémenté par une écriture atomique PostgreSQL à
 * l'intérieur de la transaction appelante : deux demandes simultanées ne
 * peuvent pas recevoir le même numéro.
 *
 * Le compteur peut toutefois se désynchroniser des données réelles : import
 * de l'existant, restauration de sauvegarde, jeu de démonstration, insertion
 * manuelle en base. Le numéro suivant tomberait alors sur une référence déjà
 * prise et l'enregistrement échouerait sur la contrainte d'unicité.
 *
 * On vérifie donc chaque numéro produit et on avance jusqu'au premier libre.
 * Le compteur se réaligne de lui-même dès la première utilisation.
 */
const MAX_ATTEMPTS = 200;

async function bump(
  tx: Prisma.TransactionClient,
  key: string,
): Promise<number> {
  const counter = await tx.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return counter.value;
}

export async function nextReservationReference(
  tx: Prisma.TransactionClient,
  date: Date = new Date(),
): Promise<string> {
  const year = date.getUTCFullYear();
  const key = `reservation:${year}`;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const value = await bump(tx, key);
    const reference = `AC-${year}-${String(value).padStart(5, "0")}`;

    const taken = await tx.reservation.findUnique({
      where: { reference },
      select: { id: true },
    });
    if (!taken) return reference;
  }

  throw new Error(
    `Impossible d'attribuer un numéro de réservation pour ${year} : ` +
      `${MAX_ATTEMPTS} numéros consécutifs sont déjà pris. ` +
      "Vérifiez la table Counter.",
  );
}

export async function nextVehicleCode(
  tx: Prisma.TransactionClient,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const value = await bump(tx, "vehicle");
    const code = `AC-V-${String(value).padStart(3, "0")}`;

    const taken = await tx.vehicle.findUnique({
      where: { internalCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }

  throw new Error(
    "Impossible d'attribuer une référence interne de véhicule : " +
      `${MAX_ATTEMPTS} références consécutives sont déjà prises. ` +
      "Vérifiez la table Counter.",
  );
}
