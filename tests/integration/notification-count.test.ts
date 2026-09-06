import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, resetDatabase } from "../setup/db";

/**
 * Compteurs de la cloche.
 *
 * La route est interrogée toute les 30 secondes par chaque écran ouvert :
 * elle doit rester triviale, et surtout refuser un visiteur sans session —
 * le nombre de demandes en attente est une information sur l'activité de
 * l'agence, pas une donnée publique.
 */
const db = createTestDb();

const sessionState = vi.hoisted(() => ({ connected: true }));

vi.mock("@/lib/db", async () => {
  const { createTestDb } = await import("../setup/db");
  return { db: createTestDb() };
});

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    getCurrentUser: async () =>
      sessionState.connected
        ? { id: "u", email: "patron@anachcar.ma", name: "Patron", role: "ADMIN" as never }
        : null,
  };
});

beforeEach(async () => {
  await resetDatabase(db);
  sessionState.connected = true;
});

describe("compteurs de notifications", () => {
  it("refuse un visiteur sans session", async () => {
    sessionState.connected = false;
    const { GET } = await import("@/app/api/admin/notifications/count/route");

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("compte les notifications non lues", async () => {
    await db.notification.createMany({
      data: [
        { type: "NEW_RESERVATION", severity: "INFO", title: "A", isRead: false },
        { type: "NEW_RESERVATION", severity: "INFO", title: "B", isRead: false },
        { type: "NEW_RESERVATION", severity: "INFO", title: "C", isRead: true },
      ],
    });

    const { GET } = await import("@/app/api/admin/notifications/count/route");
    const body = (await (await GET()).json()) as { unread: number };

    // Seules les non lues comptent : sinon la pastille ne redescendrait
    // jamais à zéro une fois les demandes traitées.
    expect(body.unread).toBe(2);
  });

  it("ne met jamais la réponse en cache", async () => {
    const { GET } = await import("@/app/api/admin/notifications/count/route");
    const response = await GET();

    // Un compteur servi depuis un cache afficherait indéfiniment l'ancien
    // nombre — exactement le défaut que cette route corrige.
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
