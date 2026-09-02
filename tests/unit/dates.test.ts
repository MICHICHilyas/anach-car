import { describe, expect, it } from "vitest";
import {
  computeRentalDays,
  formatDateShort,
  localToUtc,
  periodsOverlap,
  toLocalDateInput,
} from "@/lib/dates";

describe("gestion des dates et du fuseau marocain", () => {
  it("convertit une saisie locale en instant UTC puis retrouve la même date", () => {
    const utc = localToUtc("2026-08-25", "10:00");
    expect(toLocalDateInput(utc)).toBe("2026-08-25");
    expect(formatDateShort(utc)).toBe("25/08/2026");
  });

  it("compte 4 jours entre le 25 et le 29 août", () => {
    const start = localToUtc("2026-08-25", "10:00");
    const end = localToUtc("2026-08-29", "10:00");
    expect(computeRentalDays(start, end, 60)).toBe(4);
  });

  it("renvoie zéro jour si le retour précède le départ", () => {
    const start = localToUtc("2026-08-29", "10:00");
    const end = localToUtc("2026-08-25", "10:00");
    expect(computeRentalDays(start, end)).toBe(0);
  });

  it("détecte correctement le chevauchement de deux périodes", () => {
    const a = [localToUtc("2026-08-25"), localToUtc("2026-08-29")] as const;

    // Chevauchement partiel
    expect(
      periodsOverlap(a[0], a[1], localToUtc("2026-08-27"), localToUtc("2026-08-31")),
    ).toBe(true);

    // Période incluse
    expect(
      periodsOverlap(a[0], a[1], localToUtc("2026-08-26"), localToUtc("2026-08-28")),
    ).toBe(true);

    // Contiguë : le retour d'un client et le départ du suivant à la même heure
    expect(
      periodsOverlap(a[0], a[1], localToUtc("2026-08-29"), localToUtc("2026-08-31")),
    ).toBe(false);

    // Sans rapport
    expect(
      periodsOverlap(a[0], a[1], localToUtc("2026-09-10"), localToUtc("2026-09-14")),
    ).toBe(false);
  });
});
