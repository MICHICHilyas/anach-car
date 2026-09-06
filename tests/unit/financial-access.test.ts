import { describe, expect, it } from "vitest";
import { canSeeFinancials, isAdmin } from "@/lib/auth";
import { UserRole } from "@/generated/prisma/enums";

/**
 * Qui voit les chiffres de gestion.
 *
 * Le gérant suit ses recettes ; les employés voient le reste à encaisser,
 * dont ils ont besoin quand un client se présente, mais ni le chiffre
 * d'affaires de l'agence ni le journal d'activité de leurs collègues.
 */
function user(role: UserRole) {
  return { id: "u", email: "x@anachcar.ma", name: "X", role };
}

describe("accès aux chiffres de gestion", () => {
  it("est ouvert au gérant", () => {
    expect(canSeeFinancials(user(UserRole.ADMIN))).toBe(true);
  });

  it("est fermé aux responsables et aux employés", () => {
    expect(canSeeFinancials(user(UserRole.MANAGER))).toBe(false);
    expect(canSeeFinancials(user(UserRole.EMPLOYEE))).toBe(false);
  });

  it("est fermé quand personne n'est connecté", () => {
    // Une session absente ne doit jamais ouvrir plus de droits qu'un employé.
    expect(canSeeFinancials(null)).toBe(false);
  });

  it("suit exactement le rôle administrateur", () => {
    for (const role of Object.values(UserRole)) {
      expect(canSeeFinancials(user(role))).toBe(isAdmin(user(role)));
    }
  });
});
