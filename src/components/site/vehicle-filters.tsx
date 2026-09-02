"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { vehicleLabels } from "@/i18n/vehicle-labels";
import {
  FUEL,
  TRANSMISSION,
  VEHICLE_CATEGORY,
} from "@/lib/labels";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Filtres du catalogue.
 *
 * Ils pilotent l'URL et rien d'autre : la sélection reste partageable,
 * indexable et fonctionne avec le bouton « précédent » du navigateur. Le
 * filtrage lui-même est fait en SQL par la page serveur.
 */
export function VehicleFilters({
  t,
  locale,
  priceRange,
  resultCount,
}: {
  t: Dictionary;
  locale: Locale;
  priceRange: { min: number; max: number };
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [openOnMobile, setOpenOnMobile] = useState(false);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function resetFilters() {
    const next = new URLSearchParams();
    // Les dates de recherche sont conservées : seuls les filtres sont remis à zéro.
    for (const key of ["start", "startTime", "end", "endTime", "pickup", "dropoff"]) {
      const value = params.get(key);
      if (value) next.set(key, value);
    }
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const activeCount = [
    "category",
    "transmission",
    "fuel",
    "seats",
    "maxPrice",
  ].filter((key) => params.get(key)).length;

  const maxPriceSteps = buildPriceSteps(priceRange);

  // Les clés restent celles de la base ; seuls les libellés sont traduits.
  const labels = vehicleLabels(locale);
  const options = {
    category: Object.keys(VEHICLE_CATEGORY).map((value) => ({
      value,
      label: labels.category(value as never),
    })),
    transmission: Object.keys(TRANSMISSION).map((value) => ({
      value,
      label: labels.transmission(value as never),
    })),
    fuel: Object.keys(FUEL).map((value) => ({
      value,
      label: labels.fuel(value as never),
    })),
  };

  const fields = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-1.5">
        <Label htmlFor="filter-category">{t.vehicles.filters.category}</Label>
        <NativeSelect
          id="filter-category"
          value={params.get("category") ?? ""}
          onChange={(e) => setParam("category", e.target.value)}
        >
          <option value="">{t.vehicles.filters.all}</option>
          {options.category.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-transmission">{t.vehicles.filters.transmission}</Label>
        <NativeSelect
          id="filter-transmission"
          value={params.get("transmission") ?? ""}
          onChange={(e) => setParam("transmission", e.target.value)}
        >
          <option value="">{t.vehicles.filters.all}</option>
          {options.transmission.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-fuel">{t.vehicles.filters.fuel}</Label>
        <NativeSelect
          id="filter-fuel"
          value={params.get("fuel") ?? ""}
          onChange={(e) => setParam("fuel", e.target.value)}
        >
          <option value="">{t.vehicles.filters.all}</option>
          {options.fuel.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-seats">{t.vehicles.filters.seats}</Label>
        <NativeSelect
          id="filter-seats"
          value={params.get("seats") ?? ""}
          onChange={(e) => setParam("seats", e.target.value)}
        >
          <option value="">{t.vehicles.filters.all}</option>
          {[2, 4, 5, 7].map((seats) => (
            <option key={seats} value={seats}>
              {seats}+
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-price">{t.vehicles.filters.maxPrice}</Label>
        <NativeSelect
          id="filter-price"
          value={params.get("maxPrice") ?? ""}
          onChange={(e) => setParam("maxPrice", e.target.value)}
        >
          <option value="">{t.vehicles.filters.all}</option>
          {maxPriceSteps.map((step) => (
            <option key={step} value={step}>
              {formatMoney(step)}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );

  return (
    <div className="rounded-[var(--radius-card)] border border-navy-100 bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="size-4 text-teal-600" />
          <span className="text-[14px] font-semibold text-navy-900">
            {t.common.filters}
          </span>
          {activeCount > 0 ? (
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11.5px] font-semibold text-teal-700">
              {activeCount}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-[13px] text-navy-400 sm:inline">
            {resultCount} {resultCount > 1 ? "véhicules" : "véhicule"}
          </span>
          {activeCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="size-3.5" />
              {t.common.reset}
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setOpenOnMobile((open) => !open)}
            aria-expanded={openOnMobile}
          >
            {openOnMobile ? t.common.close : t.common.filter}
          </Button>
        </div>
      </div>

      <div className={cn("mt-5", !openOnMobile && "hidden lg:block")}>
        {fields}
      </div>
    </div>
  );
}

/** Paliers de prix arrondis à la centaine, calés sur la flotte réelle. */
function buildPriceSteps(range: { min: number; max: number }): number[] {
  const steps: number[] = [];
  const start = Math.ceil(range.min / 10000) * 10000;
  const end = Math.ceil(range.max / 10000) * 10000;
  for (let value = start; value <= end; value += 10000) steps.push(value);
  return steps.length ? steps : [end];
}
