import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readStoredFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

/**
 * Téléchargement d'un document client (CIN, permis, contrat).
 *
 * Point sensible du système : ces fichiers ne sont jamais servis
 * statiquement. Chaque requête vérifie la session en base, et l'accès est
 * journalisé — on sait qui a consulté quel document, et quand.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const document = await db.document.findUnique({
    where: { id },
    select: {
      storageKey: true,
      mimeType: true,
      fileName: true,
      customerId: true,
      title: true,
    },
  });

  if (!document) return new NextResponse("Not found", { status: 404 });

  try {
    const buffer = await readStoredFile(document.storageKey);

    await logAudit({
      user,
      action: "document.read",
      summary: `Consultation du document « ${document.title ?? document.fileName} »`,
      entityType: "Document",
      entityId: id,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(document.fileName)}"`,
        // Aucune mise en cache : un document révoqué ne doit pas survivre
        // dans le cache d'un navigateur partagé au comptoir.
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
