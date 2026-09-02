import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

/**
 * Journal d'activité administrative : qui a fait quoi, et quand.
 * Volontairement « best effort » — un échec d'écriture du journal ne doit
 * jamais faire échouer l'action métier qu'il accompagne.
 */
export async function logAudit(params: {
  user: SessionUser | null;
  action: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const headerList = await headers();
    await db.auditLog.create({
      data: {
        userId: params.user?.id ?? null,
        userLabel: params.user?.name ?? "Système",
        action: params.action,
        summary: params.summary,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        metadata: (params.metadata ?? undefined) as never,
        ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] écriture impossible", error);
  }
}
