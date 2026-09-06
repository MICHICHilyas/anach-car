import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, resetDatabase } from "../setup/db";

/**
 * Gestion des comptes du personnel.
 *
 * L'essentiel de ces tests porte sur une seule règle : l'agence ne doit
 * JAMAIS pouvoir se retrouver sans administrateur actif. Une fausse
 * manœuvre l'enfermerait dehors, et il faudrait alors un accès au serveur
 * pour réparer — précisément ce que cette interface vise à éviter.
 */
const db = createTestDb();

vi.mock("@/lib/db", async () => {
  const { createTestDb } = await import("../setup/db");
  return { db: createTestDb() };
});

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1" }),
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

// Rôle de la personne connectée, modifiable par les tests.
const actorState = vi.hoisted(() => ({ role: "ADMIN" as string }));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  const actor = () => ({
    id: "actor",
    email: "patron@anachcar.ma",
    name: "Patron",
    role: actorState.role as never,
  });
  return {
    ...actual,
    getCurrentUser: async () => actor(),
    requireUser: async () => actor(),
    requireUserOrThrow: async (roles?: string[]) => {
      if (roles && !roles.includes(actorState.role)) {
        throw new Error("Vous n'avez pas les droits nécessaires pour cette action.");
      }
      return actor();
    },
  };
});

beforeAll(async () => {
  await resetDatabase(db);
});

beforeEach(async () => {
  actorState.role = "ADMIN";
  await db.session.deleteMany();
  await db.auditLog.deleteMany();
  await db.user.deleteMany();
  // La personne connectée : le seul administrateur de départ.
  await db.user.create({
    data: {
      id: "actor",
      email: "patron@anachcar.ma",
      name: "Patron",
      passwordHash: "x",
      role: "ADMIN",
    },
  });
});

afterAll(async () => {
  await resetDatabase(db);
  await db.$disconnect();
});

const newAccount = (overrides: Record<string, unknown> = {}) => ({
  name: "Sara El Amrani",
  email: "sara@anachcar.ma",
  role: "EMPLOYEE",
  phone: "+212 662 345 678",
  password: "MotDePasse2026",
  ...overrides,
});

describe("création de comptes", () => {
  it("crée un compte utilisable, avec un mot de passe haché", async () => {
    const { createUser } = await import("@/server/actions/users");
    const { verifyPassword } = await import("@/lib/auth");

    const result = await createUser(newAccount());
    expect(result.ok).toBe(true);

    const created = await db.user.findUnique({
      where: { email: "sara@anachcar.ma" },
    });

    expect(created!.role).toBe("EMPLOYEE");
    expect(created!.isActive).toBe(true);
    // Le mot de passe n'est jamais stocké en clair.
    expect(created!.passwordHash).not.toBe("MotDePasse2026");
    expect(await verifyPassword("MotDePasse2026", created!.passwordHash)).toBe(true);
  });

  it("refuse une adresse email déjà utilisée", async () => {
    const { createUser } = await import("@/server/actions/users");

    await createUser(newAccount());
    const second = await createUser(newAccount({ name: "Autre personne" }));

    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.fieldErrors?.email).toBeDefined();
    expect(await db.user.count()).toBe(2); // le patron + Sara
  });

  it("refuse un mot de passe trop court", async () => {
    const { createUser } = await import("@/server/actions/users");

    const result = await createUser(newAccount({ password: "1234" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.password).toBeDefined();
  });

  it("interdit la création à un employé ou un responsable", async () => {
    const { createUser } = await import("@/server/actions/users");

    for (const role of ["EMPLOYEE", "MANAGER"]) {
      actorState.role = role;
      const result = await createUser(newAccount({ email: `x-${role}@anachcar.ma` }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("droits");
    }
    expect(await db.user.count()).toBe(1);
  });
});

describe("protection contre l'auto-verrouillage", () => {
  it("refuse de rétrograder le dernier administrateur", async () => {
    const { updateUser } = await import("@/server/actions/users");

    const result = await updateUser("actor", {
      name: "Patron",
      email: "patron@anachcar.ma",
      role: "EMPLOYEE",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("dernier administrateur");
    expect((await db.user.findUnique({ where: { id: "actor" } }))!.role).toBe("ADMIN");
  });

  it("autorise la rétrogradation dès qu'un autre administrateur existe", async () => {
    const { createUser, updateUser } = await import("@/server/actions/users");

    await createUser(newAccount({ role: "ADMIN" }));
    const result = await updateUser("actor", {
      name: "Patron",
      email: "patron@anachcar.ma",
      role: "MANAGER",
    });

    expect(result.ok).toBe(true);
  });

  it("empêche de se désactiver ou de se supprimer soi-même", async () => {
    const { deleteUser, setUserActive } = await import("@/server/actions/users");

    const disabled = await setUserActive("actor", false);
    expect(disabled.ok).toBe(false);
    if (!disabled.ok) expect(disabled.error).toContain("propre compte");

    const removed = await deleteUser("actor");
    expect(removed.ok).toBe(false);
    if (!removed.ok) expect(removed.error).toContain("propre compte");

    expect(await db.user.count()).toBe(1);
  });

  it("refuse de désactiver le dernier administrateur, même par un autre compte", async () => {
    const { createUser, setUserActive } = await import("@/server/actions/users");

    // Un second administrateur qui désactive le premier : autorisé.
    await createUser(newAccount({ role: "ADMIN" }));
    const other = await db.user.findUnique({ where: { email: "sara@anachcar.ma" } });

    expect((await setUserActive("actor", false)).ok).toBe(false); // soi-même

    // En revanche, si le premier est déjà désactivé, le second est le dernier.
    await db.user.update({ where: { id: "actor" }, data: { isActive: false } });
    const result = await setUserActive(other!.id, false);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("dernier administrateur");
  });
});

describe("désactivation et mot de passe", () => {
  it("désactiver un compte ferme ses sessions immédiatement", async () => {
    const { createUser, setUserActive } = await import("@/server/actions/users");

    await createUser(newAccount());
    const employee = await db.user.findUnique({ where: { email: "sara@anachcar.ma" } });

    await db.session.create({
      data: {
        tokenHash: "hash-de-test",
        userId: employee!.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    const result = await setUserActive(employee!.id, false);
    expect(result.ok).toBe(true);

    // L'accès est coupé sans attendre l'expiration du cookie.
    expect(await db.session.count({ where: { userId: employee!.id } })).toBe(0);
    expect((await db.user.findUnique({ where: { id: employee!.id } }))!.isActive).toBe(
      false,
    );
  });

  it("réinitialiser le mot de passe déconnecte le compte partout", async () => {
    const { createUser, resetUserPassword } = await import("@/server/actions/users");
    const { verifyPassword } = await import("@/lib/auth");

    await createUser(newAccount());
    const employee = await db.user.findUnique({ where: { email: "sara@anachcar.ma" } });

    await db.session.create({
      data: {
        tokenHash: "hash-de-test-2",
        userId: employee!.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    const result = await resetUserPassword({
      userId: employee!.id,
      password: "NouveauMotDePasse2026",
    });
    expect(result.ok).toBe(true);

    const updated = await db.user.findUnique({ where: { id: employee!.id } });
    expect(await verifyPassword("NouveauMotDePasse2026", updated!.passwordHash)).toBe(
      true,
    );
    expect(await db.session.count({ where: { userId: employee!.id } })).toBe(0);
  });

  it("journalise chaque intervention sur un compte", async () => {
    const { createUser, setUserActive } = await import("@/server/actions/users");

    await createUser(newAccount());
    const employee = await db.user.findUnique({ where: { email: "sara@anachcar.ma" } });
    await setUserActive(employee!.id, false);

    const actions = (
      await db.auditLog.findMany({ orderBy: { createdAt: "asc" } })
    ).map((entry) => entry.action);

    expect(actions).toContain("user.create");
    expect(actions).toContain("user.disable");
  });
  describe("changement de son propre mot de passe", () => {
    /*
     * Distinct de la réinitialisation par un administrateur : ici le mot de
     * passe actuel est exigé, et l'opération est ouverte à tous les rôles.
     * C'est ce qui permet à un employé de gérer son compte sans que le gérant
     * ait à connaître son mot de passe.
     */
    async function ownAccount(password = "MotDePasseActuel1") {
      const { hashPassword } = await import("@/lib/auth");
      // Chaque cas repart d'un compte neuf : l'identifiant est fixé par le
      // mock d'authentification, donc réutilisé d'un test à l'autre.
      await db.session.deleteMany({ where: { userId: "actor" } });
      await db.user.deleteMany({ where: { id: "actor" } });
      return db.user.create({
        data: {
          id: "actor", // l'identité renvoyée par le mock d'authentification
          email: "patron@anachcar.ma",
          name: "Patron",
          role: "ADMIN",
          passwordHash: await hashPassword(password),
        },
      });
    }

    it("change le mot de passe et invalide toutes les sessions", async () => {
      const { changeOwnPassword } = await import("@/server/actions/users");
      const { verifyPassword } = await import("@/lib/auth");
      const account = await ownAccount();
      await db.session.create({
        data: {
          userId: account.id,
          tokenHash: "session-ouverte-ailleurs",
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      });

      const result = await changeOwnPassword({
        currentPassword: "MotDePasseActuel1",
        password: "NouveauMotDePasse2",
        confirmPassword: "NouveauMotDePasse2",
      });

      expect(result.ok).toBe(true);
      const updated = await db.user.findUnique({ where: { id: account.id } });
      expect(await verifyPassword("NouveauMotDePasse2", updated!.passwordHash)).toBe(true);
      // Un mot de passe changé par crainte d'une compromission ne doit
      // laisser vivre aucune session ouverte ailleurs.
      expect(await db.session.count({ where: { userId: account.id } })).toBe(0);
    });

    it("refuse si le mot de passe actuel est faux", async () => {
      const { changeOwnPassword } = await import("@/server/actions/users");
      const { verifyPassword } = await import("@/lib/auth");
      const account = await ownAccount();

      const result = await changeOwnPassword({
        currentPassword: "PasLeBonMotDePasse",
        password: "NouveauMotDePasse2",
        confirmPassword: "NouveauMotDePasse2",
      });

      expect(result.ok).toBe(false);
      // Sans cette vérification, une session laissée ouverte sur un poste de
      // l'agence suffirait à s'approprier le compte.
      const unchanged = await db.user.findUnique({ where: { id: account.id } });
      expect(await verifyPassword("MotDePasseActuel1", unchanged!.passwordHash)).toBe(true);
    });

    it("refuse une confirmation qui ne correspond pas", async () => {
      const { changeOwnPassword } = await import("@/server/actions/users");
      await ownAccount();

      const result = await changeOwnPassword({
        currentPassword: "MotDePasseActuel1",
        password: "NouveauMotDePasse2",
        confirmPassword: "NouveauMotDePasse3",
      });

      expect(result.ok).toBe(false);
    });

    it("est ouvert aux employés, pas seulement aux administrateurs", async () => {
      const { changeOwnPassword } = await import("@/server/actions/users");
      const account = await ownAccount();
      await db.user.update({ where: { id: account.id }, data: { role: "EMPLOYEE" } });
      actorState.role = "EMPLOYEE";

      const result = await changeOwnPassword({
        currentPassword: "MotDePasseActuel1",
        password: "NouveauMotDePasse2",
        confirmPassword: "NouveauMotDePasse2",
      });

      actorState.role = "ADMIN";
      expect(result.ok).toBe(true);
    });
  });
});
