import { describe, expect, it } from "vitest";
import { buildQuote, resolveBaseDailyRate } from "@/lib/pricing";
import type { PricingRule } from "@/generated/prisma/client";

/**
 * Le calcul du prix est la promesse commerciale de l'agence : un écart entre
 * le montant affiché et le montant facturé est inacceptable.
 */

const clio = {
  id: "vehicle-1",
  category: "COMPACTE" as const,
  dailyRate: 25000, // 250 DH
  rate3Days: 23000, // 230 DH
  weeklyRate: 21000, // 210 DH
  monthlyRate: 18000, // 180 DH
};

const at = (day: number, hour = 10) =>
  new Date(Date.UTC(2026, 7, day, hour, 0, 0));

function rule(overrides: Partial<PricingRule>): PricingRule {
  return {
    id: "rule",
    name: "Règle",
    type: "SEASON",
    vehicleId: null,
    category: null,
    startDate: null,
    endDate: null,
    minDays: null,
    maxDays: null,
    multiplier: null,
    fixedDailyRate: null,
    discountPercent: null,
    flatAmount: null,
    priority: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as PricingRule;
}

describe("calcul du prix d'une location", () => {
  it("applique l'exemple du cahier des charges : 4 jours x 250 DH = 1 000 DH", () => {
    const vehicleWithoutTiers = { ...clio, rate3Days: null, weeklyRate: null, monthlyRate: null };
    const quote = buildQuote(vehicleWithoutTiers, at(25), at(29));

    expect(quote.days).toBe(4);
    expect(quote.dailyRate).toBe(25000);
    expect(quote.total).toBe(100000); // 1 000,00 DH
  });

  it("facture au minimum une journée pour une location de quelques heures", () => {
    const quote = buildQuote(clio, at(25, 9), at(25, 14));
    expect(quote.days).toBe(1);
    expect(quote.total).toBe(clio.dailyRate);
  });

  it("bascule sur le tarif 3 jours dès le 3e jour", () => {
    expect(resolveBaseDailyRate(clio, 2).rate).toBe(25000);
    expect(resolveBaseDailyRate(clio, 3).rate).toBe(23000);
    expect(resolveBaseDailyRate(clio, 7).rate).toBe(21000);
    expect(resolveBaseDailyRate(clio, 30).rate).toBe(18000);
  });

  it("ignore un palier non renseigné et retombe sur le tarif inférieur", () => {
    const sansForfaitSemaine = { ...clio, weeklyRate: null };
    expect(resolveBaseDailyRate(sansForfaitSemaine, 8).rate).toBe(23000);
  });

  it("tolère un léger retard sans facturer un jour supplémentaire", () => {
    // Retour avec 45 minutes de retard, tolérance par défaut de 60 minutes.
    const quote = buildQuote(clio, at(25, 10), at(29, 10.75), { graceMinutes: 60 });
    expect(quote.days).toBe(4);
  });

  it("facture un jour de plus au-delà de la tolérance", () => {
    const quote = buildQuote(clio, at(25, 10), at(29, 12), { graceMinutes: 60 });
    expect(quote.days).toBe(5);
  });

  it("majore le tarif en haute saison", () => {
    const quote = buildQuote(clio, at(25), at(29), {
      rules: [rule({ name: "Haute saison", type: "SEASON", multiplier: 1.2 })],
    });
    // 230 DH (tarif 3 jours) x 1,2 = 276 DH
    expect(quote.dailyRate).toBe(27600);
    expect(quote.total).toBe(27600 * 4);
    expect(quote.rateLabel).toBe("Haute saison");
  });

  it("applique une remise longue durée en pourcentage", () => {
    const quote = buildQuote(clio, at(1), at(21), {
      rules: [
        rule({
          name: "Remise longue durée",
          type: "LONG_DURATION",
          minDays: 15,
          discountPercent: 10,
        }),
      ],
    });
    expect(quote.days).toBe(20);
    expect(quote.subtotal).toBe(21000 * 20);
    expect(quote.discount).toBe(Math.round(quote.subtotal * 0.1));
    expect(quote.total).toBe(quote.subtotal - quote.discount);
  });

  it("n'applique pas une remise longue durée à une courte location", () => {
    const quote = buildQuote(clio, at(25), at(29), {
      rules: [
        rule({ name: "Remise", type: "LONG_DURATION", minDays: 15, discountPercent: 10 }),
      ],
    });
    expect(quote.discount).toBe(0);
  });

  it("ajoute les suppléments de lieu de prise en charge", () => {
    const quote = buildQuote(clio, at(25), at(29), {
      locationFees: [{ label: "Aéroport", amount: 15000 }],
    });
    expect(quote.extraFees).toBe(15000);
    expect(quote.total).toBe(quote.subtotal + 15000);
  });

  it("ne descend jamais sous zéro, même avec une remise excessive", () => {
    const quote = buildQuote(clio, at(25), at(29), {
      rules: [rule({ name: "Promo", type: "PROMO", discountPercent: 150 })],
    });
    expect(quote.total).toBeGreaterThanOrEqual(0);
    expect(quote.discount).toBeLessThanOrEqual(quote.subtotal);
  });

  it("ignore une règle inactive ou destinée à un autre véhicule", () => {
    const quote = buildQuote(clio, at(25), at(29), {
      rules: [
        rule({ name: "Inactive", multiplier: 2, isActive: false }),
        rule({ name: "Autre véhicule", multiplier: 3, vehicleId: "vehicle-2" }),
      ],
    });
    expect(quote.dailyRate).toBe(23000);
  });

  it("détaille le devis ligne par ligne pour l'affichage client", () => {
    const quote = buildQuote(clio, at(25), at(29), {
      locationFees: [{ label: "Aéroport", amount: 15000 }],
    });
    expect(quote.lines[0].kind).toBe("base");
    expect(quote.lines.some((line) => line.kind === "fee")).toBe(true);
    const sum = quote.lines.reduce((total, line) => total + line.amount, 0);
    expect(sum).toBe(quote.total);
  });
});
