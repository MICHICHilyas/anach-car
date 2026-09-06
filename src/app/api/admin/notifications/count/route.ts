import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Compteurs de la cloche, interrogés périodiquement par l'espace agence.
 *
 * Sans cela, le nombre n'était recalculé qu'au chargement d'une page : le
 * gérant pouvait laisser son écran ouvert pendant qu'une demande arrivait
 * sans jamais le voir.
 *
 * La réponse ne contient que deux nombres — aucune donnée client ne transite
 * ici, et la session est vérifiée comme partout ailleurs.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const [unread, pending] = await Promise.all([
    db.notification.count({ where: { isRead: false } }),
    db.reservation.count({ where: { status: "PENDING" } }),
  ]);

  return NextResponse.json(
    { unread, pending },
    // Jamais de cache : un compteur périmé est pire qu'inutile.
    { headers: { "Cache-Control": "no-store" } },
  );
}
