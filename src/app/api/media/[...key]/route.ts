import { NextResponse } from "next/server";
import { isValidKey, readStoredFile } from "@/lib/storage";

/**
 * Sert les photos de véhicules quand le stockage local est utilisé.
 *
 * Uniquement le dossier `vehicles` : les documents clients ne passent JAMAIS
 * par cette route publique. La clé est validée par une expression régulière
 * stricte, ce qui interdit toute remontée d'arborescence (`../../.env`).
 */
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: segments } = await params;
  const key = segments.join("/");

  if (!isValidKey(key) || !key.startsWith("vehicles/")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const extension = key.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = MIME_BY_EXTENSION[extension];
  if (!mimeType) return new NextResponse("Not found", { status: 404 });

  try {
    const buffer = await readStoredFile(key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        // Les clés sont uniques (UUID) : le contenu ne change jamais.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
