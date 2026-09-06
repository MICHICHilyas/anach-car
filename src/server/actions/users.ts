"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { UserRole } from "@/generated/prisma/enums";
import { hashPassword, requireUserOrThrow, verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { USER_ROLE } from "@/lib/labels";
import {
  changePasswordSchema,
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
} from "@/lib/validation/user";
import type { ActionResult } from "@/server/actions/reservations";

/**
 * Gestion des comptes du personnel.
 *
 * Deux garde-fous structurent tout ce fichier :
 *
 *  1. seul un ADMIN peut toucher aux comptes ;
 *  2. l'agence doit conserver en permanence AU MOINS UN administrateur
 *     actif, et personne ne peut se retirer à soi-même ses propres droits.
 *     Sans cela, une fausse manœuvre enferme définitivement l'agence
 *     dehors — il faudrait alors un accès au serveur pour réparer.
 */
type UserActionResult = ActionResult<{ id: string }> & {
  fieldErrors?: Record<string, string>;
};

function refresh() {
  revalidatePath("/admin/parametres");
}

/** Nombre d'administrateurs actifs, en excluant éventuellement un compte. */
async function countActiveAdmins(exceptId?: string): Promise<number> {
  return db.user.count({
    where: {
      role: UserRole.ADMIN,
      isActive: true,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
  });
}

export async function createUser(input: unknown): Promise<UserActionResult> {
  try {
    const actor = await requireUserOrThrow([UserRole.ADMIN]);
    const parsed = createUserSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: firstError(parsed.error), fieldErrors: fields(parsed.error) };
    }
    const data = parsed.data;

    const existing = await db.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existing) {
      return {
        ok: false,
        error: "Un compte utilise déjà cette adresse email.",
        fieldErrors: { email: "Adresse déjà utilisée" },
      };
    }

    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone || null,
        passwordHash: await hashPassword(data.password),
      },
      select: { id: true, name: true, email: true, role: true },
    });

    await logAudit({
      user: actor,
      action: "user.create",
      summary: `Compte ${user.name} créé (${USER_ROLE[user.role]})`,
      entityType: "User",
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    refresh();
    return { ok: true, data: { id: user.id } };
  } catch (error) {
    return failure(error);
  }
}

export async function updateUser(
  userId: string,
  input: unknown,
): Promise<UserActionResult> {
  try {
    const actor = await requireUserOrThrow([UserRole.ADMIN]);
    const parsed = updateUserSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: firstError(parsed.error), fieldErrors: fields(parsed.error) };
    }
    const data = parsed.data;

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true, name: true },
    });
    if (!target) return { ok: false, error: "Compte introuvable." };

    // Retirer le dernier administrateur actif verrouillerait l'agence dehors.
    if (
      target.role === UserRole.ADMIN &&
      data.role !== UserRole.ADMIN &&
      target.isActive &&
      (await countActiveAdmins(target.id)) === 0
    ) {
      return {
        ok: false,
        error:
          "Impossible : ce compte est le dernier administrateur actif. Nommez d'abord un autre administrateur.",
      };
    }

    const duplicate = await db.user.findFirst({
      where: { email: data.email, id: { not: userId } },
      select: { id: true },
    });
    if (duplicate) {
      return {
        ok: false,
        error: "Un autre compte utilise déjà cette adresse email.",
        fieldErrors: { email: "Adresse déjà utilisée" },
      };
    }

    await db.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone || null,
      },
    });

    await logAudit({
      user: actor,
      action: "user.update",
      summary: `Compte ${data.name} modifié (${USER_ROLE[data.role]})`,
      entityType: "User",
      entityId: userId,
    });

    refresh();
    return { ok: true, data: { id: userId } };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Active ou désactive un compte.
 *
 * La désactivation supprime les sessions ouvertes : l'accès est coupé
 * immédiatement, sans attendre l'expiration du cookie.
 */
export async function setUserActive(
  userId: string,
  isActive: boolean,
): Promise<UserActionResult> {
  try {
    const actor = await requireUserOrThrow([UserRole.ADMIN]);

    if (userId === actor.id && !isActive) {
      return { ok: false, error: "Vous ne pouvez pas désactiver votre propre compte." };
    }

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });
    if (!target) return { ok: false, error: "Compte introuvable." };

    if (
      !isActive &&
      target.role === UserRole.ADMIN &&
      (await countActiveAdmins(target.id)) === 0
    ) {
      return {
        ok: false,
        error: "Impossible : c'est le dernier administrateur actif de l'agence.",
      };
    }

    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { isActive } });
      if (!isActive) {
        await tx.session.deleteMany({ where: { userId } });
      }
    });

    await logAudit({
      user: actor,
      action: isActive ? "user.enable" : "user.disable",
      summary: `Compte ${target.name} ${isActive ? "réactivé" : "désactivé"}`,
      entityType: "User",
      entityId: userId,
    });

    refresh();
    return { ok: true, data: { id: userId } };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Changement de son PROPRE mot de passe, quel que soit le rôle.
 *
 * Distinct de `resetUserPassword`, réservé aux administrateurs : ici le mot
 * de passe actuel est vérifié, ce qui empêche qu'une session laissée ouverte
 * sur un poste de l'agence permette de s'approprier le compte. C'est aussi
 * la seule voie par laquelle un employé peut changer son mot de passe sans
 * que le gérant ait à le connaître.
 */
export async function changeOwnPassword(input: unknown): Promise<UserActionResult> {
  try {
    const actor = await requireUserOrThrow();
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: firstError(parsed.error), fieldErrors: fields(parsed.error) };
    }

    const account = await db.user.findUnique({
      where: { id: actor.id },
      select: { id: true, name: true, passwordHash: true },
    });
    if (!account) return { ok: false, error: "Compte introuvable." };

    const valid = await verifyPassword(parsed.data.currentPassword, account.passwordHash);
    if (!valid) {
      return {
        ok: false,
        error: "Mot de passe actuel incorrect.",
        fieldErrors: { currentPassword: "Mot de passe actuel incorrect." },
      };
    }

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: account.id },
        data: { passwordHash: await hashPassword(parsed.data.password) },
      });
      /*
       * Toutes les sessions tombent, y compris celle en cours : si le mot de
       * passe est changé parce qu'on le croit compromis, laisser vivre les
       * sessions ouvertes ailleurs viderait l'opération de son sens.
       */
      await tx.session.deleteMany({ where: { userId: account.id } });
    });

    await logAudit({
      user: actor,
      action: "user.password.self",
      summary: `${account.name} a changé son mot de passe`,
      entityType: "User",
      entityId: account.id,
    });

    return { ok: true, data: { id: account.id } };
  } catch (error) {
    return failure(error);
  }
}

/** Réinitialise le mot de passe et déconnecte le compte partout. */
export async function resetUserPassword(input: unknown): Promise<UserActionResult> {
  try {
    const actor = await requireUserOrThrow([UserRole.ADMIN]);
    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: firstError(parsed.error), fieldErrors: fields(parsed.error) };
    }

    const target = await db.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, name: true },
    });
    if (!target) return { ok: false, error: "Compte introuvable." };

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: target.id },
        data: { passwordHash: await hashPassword(parsed.data.password) },
      });
      // Les sessions ouvertes avec l'ancien mot de passe sont invalidées.
      await tx.session.deleteMany({ where: { userId: target.id } });
    });

    await logAudit({
      user: actor,
      action: "user.password",
      summary: `Mot de passe réinitialisé pour ${target.name}`,
      entityType: "User",
      entityId: target.id,
    });

    refresh();
    return { ok: true, data: { id: target.id } };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Suppression définitive.
 *
 * Le journal d'activité conserve le nom de l'auteur des actions passées :
 * l'historique reste lisible après le départ d'un employé.
 */
export async function deleteUser(userId: string): Promise<UserActionResult> {
  try {
    const actor = await requireUserOrThrow([UserRole.ADMIN]);

    if (userId === actor.id) {
      return { ok: false, error: "Vous ne pouvez pas supprimer votre propre compte." };
    }

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, isActive: true },
    });
    if (!target) return { ok: false, error: "Compte introuvable." };

    if (
      target.role === UserRole.ADMIN &&
      target.isActive &&
      (await countActiveAdmins(target.id)) === 0
    ) {
      return {
        ok: false,
        error: "Impossible : c'est le dernier administrateur actif de l'agence.",
      };
    }

    await db.user.delete({ where: { id: userId } });

    await logAudit({
      user: actor,
      action: "user.delete",
      summary: `Compte ${target.name} supprimé`,
      entityType: "User",
      entityId: userId,
    });

    refresh();
    return { ok: true, data: { id: userId } };
  } catch (error) {
    return failure(error);
  }
}

function firstError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Données invalides.";
}

function fields(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key]) result[key] = issue.message;
  }
  return result;
}

function failure(error: unknown): { ok: false; error: string } {
  const message = error instanceof Error ? error.message : "Une erreur est survenue.";
  console.error("[users]", error);
  return { ok: false, error: message };
}
