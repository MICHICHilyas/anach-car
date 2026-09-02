import type { PricingRule, Vehicle } from "@/generated/prisma/client";
import { computeRentalDays } from "@/lib/dates";

/**
 * Moteur de tarification.
 *
 * Fonction PURE et testable : elle ne touche jamais la base. L'appelant
 * fournit le véhicule, la période et les règles actives ; elle renvoie un
 * devis détaillé, ligne par ligne, que l'on affiche au client avant l'envoi
 * de sa demande et que l'on fige ensuite dans la réservation.
 */

export type QuoteLine = {
  label: string;
  detail?: string;
  amount: number; // centimes, négatif pour une remise
  kind: "base" | "fee" | "discount";
};

export type Quote = {
  days: number;
  dailyRate: number;
  rateLabel: string;
  subtotal: number;
  extraFees: number;
  discount: number;
  total: number;
  lines: QuoteLine[];
};

export type PricingVehicle = Pick<
  Vehicle,
  | "id"
  | "category"
  | "dailyRate"
  | "rate3Days"
  | "weeklyRate"
  | "monthlyRate"
>;

export type QuoteOptions = {
  rules?: PricingRule[];
  /** Suppléments de lieu de prise en charge / restitution (centimes). */
  locationFees?: { label: string; amount: number }[];
  graceMinutes?: number;
};

/**
 * Tarif journalier de base selon la durée : plus la location est longue,
 * moins la journée coûte cher. Les paliers non renseignés sont ignorés.
 */
export function resolveBaseDailyRate(
  vehicle: PricingVehicle,
  days: number,
): { rate: number; label: string } {
  if (days >= 30 && vehicle.monthlyRate) {
    return { rate: vehicle.monthlyRate, label: "Tarif mensuel (30 j et +)" };
  }
  if (days >= 7 && vehicle.weeklyRate) {
    return { rate: vehicle.weeklyRate, label: "Tarif semaine (7 j et +)" };
  }
  if (days >= 3 && vehicle.rate3Days) {
    return { rate: vehicle.rate3Days, label: "Tarif 3 jours et +" };
  }
  return { rate: vehicle.dailyRate, label: "Tarif journalier" };
}

function ruleApplies(
  rule: PricingRule,
  vehicle: PricingVehicle,
  start: Date,
  end: Date,
  days: number,
): boolean {
  if (!rule.isActive) return false;
  if (rule.vehicleId && rule.vehicleId !== vehicle.id) return false;
  if (rule.category && rule.category !== vehicle.category) return false;
  if (rule.minDays && days < rule.minDays) return false;
  if (rule.maxDays && days > rule.maxDays) return false;
  // La règle doit recouvrir au moins une partie de la période louée.
  if (rule.startDate && end <= rule.startDate) return false;
  if (rule.endDate && start >= rule.endDate) return false;
  return true;
}

export function buildQuote(
  vehicle: PricingVehicle,
  start: Date,
  end: Date,
  options: QuoteOptions = {},
): Quote {
  const {
    rules = [],
    locationFees = [], graceMinutes = 60 } = options;

  const days = computeRentalDays(start, end, graceMinutes);
  const base = resolveBaseDailyRate(vehicle, days);

  const applicable = rules
    .filter((rule) => ruleApplies(rule, vehicle, start, end, days))
    .sort((a, b) => b.priority - a.priority);

  // 1. Les règles SEASON ajustent le tarif journalier lui-même.
  let dailyRate = base.rate;
  let rateLabel = base.label;
  const lines: QuoteLine[] = [];

  for (const rule of applicable.filter((r) => r.type === "SEASON")) {
    if (rule.fixedDailyRate != null) {
      dailyRate = rule.fixedDailyRate;
      rateLabel = rule.name;
    } else if (rule.multiplier != null) {
      dailyRate = Math.round(dailyRate * rule.multiplier);
      rateLabel = rule.name;
    }
    break; // une seule saison s'applique : la plus prioritaire
  }

  const subtotal = dailyRate * days;
  lines.push({
    label: rateLabel,
    detail: `${days} ${days > 1 ? "jours" : "jour"}`,
    amount: subtotal,
    kind: "base",
  });

  // 2. Frais additionnels (lieux de prise en charge, règles EXTRA_FEE).
  let extraFees = 0;
  for (const fee of locationFees) {
    if (fee.amount === 0) continue;
    extraFees += fee.amount;
    lines.push({ label: fee.label, amount: fee.amount, kind: "fee" });
  }
  for (const rule of applicable.filter((r) => r.type === "EXTRA_FEE")) {
    const amount = rule.flatAmount ?? 0;
    if (amount === 0) continue;
    extraFees += amount;
    lines.push({ label: rule.name, amount, kind: "fee" });
  }

  // 3. Remises (promotions, longue durée), calculées sur le sous-total.
  let discount = 0;
  for (const rule of applicable.filter(
    (r) => r.type === "PROMO" || r.type === "LONG_DURATION",
  )) {
    let amount = 0;
    if (rule.discountPercent) {
      amount = Math.round((subtotal * rule.discountPercent) / 100);
    } else if (rule.flatAmount) {
      amount = rule.flatAmount;
    }
    if (amount <= 0) continue;
    discount += amount;
    lines.push({ label: rule.name, amount: -amount, kind: "discount" });
  }

  discount = Math.min(discount, subtotal); // jamais de total négatif
  const total = subtotal + extraFees - discount;

  return {
    days,
    dailyRate,
    rateLabel,
    subtotal,
    extraFees,
    discount,
    total,
    lines,
  };
}
