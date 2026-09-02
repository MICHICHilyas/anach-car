"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import {
  CUSTOM_LOCATION,
  defaultSearchValues,
  todayInput,
  type SearchValues,
} from "@/lib/search-params";

export type SearchLocation = {
  id: string;
  name: string;
  nameEn: string | null;
  nameAr: string | null;
  isPickup: boolean;
  isDropoff: boolean;
};

/**
 * Moteur de recherche de disponibilité.
 *
 * Il ne fait que construire l'URL du catalogue : c'est la page
 * /[locale]/vehicules qui interroge la base côté serveur. Aucun calcul de
 * disponibilité n'est donc réalisé dans le navigateur.
 */
export function SearchBar({
  locale,
  t,
  locations,
  defaultValues,
  variant = "hero",
}: {
  locale: Locale;
  t: Dictionary;
  locations: SearchLocation[];
  defaultValues?: Partial<SearchValues>;
  variant?: "hero" | "inline";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<SearchValues>({
    ...defaultSearchValues(),
    ...defaultValues,
  });

  function update<K extends keyof SearchValues>(key: K, value: SearchValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function localizedName(location: SearchLocation) {
    if (locale === "en") return location.nameEn ?? location.name;
    if (locale === "ar") return location.nameAr ?? location.name;
    return location.name;
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!values.start || !values.end) {
      setError(t.search.errors.missingDates);
      return;
    }

    const start = new Date(`${values.start}T${values.startTime}`);
    const end = new Date(`${values.end}T${values.endTime}`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (new Date(values.start) < today) {
      setError(t.search.errors.pastDate);
      return;
    }
    if (end <= start) {
      setError(t.search.errors.invalidPeriod);
      return;
    }

    const params = new URLSearchParams({
      start: values.start,
      startTime: values.startTime,
      end: values.end,
      endTime: values.endTime,
    });
    if (values.pickupId) params.set("pickup", values.pickupId);
    if (values.dropoffId) params.set("dropoff", values.dropoffId);
    if (values.pickupId === CUSTOM_LOCATION && values.pickupText.trim()) {
      params.set("pickupText", values.pickupText.trim());
    }
    if (values.dropoffId === CUSTOM_LOCATION && values.dropoffText.trim()) {
      params.set("dropoffText", values.dropoffText.trim());
    }

    router.push(`/${locale}/vehicules?${params.toString()}`);
  }

  const pickupOptions = locations.filter((l) => l.isPickup);
  const dropoffOptions = locations.filter((l) => l.isDropoff);

  return (
    <form
      onSubmit={submit}
      className={cn(
        "rounded-[1.25rem] bg-white p-5 sm:p-6 lg:p-7",
        variant === "hero"
          ? "shadow-[0_2px_6px_rgba(6,27,39,.06),0_24px_60px_-28px_rgba(6,27,39,.45)] ring-1 ring-navy-900/5"
          : "border border-navy-100 shadow-[var(--shadow-soft)]",
      )}
      aria-label={t.search.title}
    >
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="search-start" className="gap-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-navy-500">
            <CalendarDays className="size-3.5 text-teal-600" />
            {t.search.pickupDate}
          </Label>
          <div className="flex gap-2">
            <Input
              id="search-start"
              type="date"
              value={values.start}
              min={todayInput()}
              onChange={(e) => update("start", e.target.value)}
              required
            />
            <Input
              type="time"
              aria-label={t.search.pickupTime}
              value={values.startTime}
              onChange={(e) => update("startTime", e.target.value)}
              className="w-[5.5rem] shrink-0 sm:w-[6.5rem]"
              step={1800}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="search-end" className="gap-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-navy-500">
            <CalendarDays className="size-3.5 text-teal-600" />
            {t.search.returnDate}
          </Label>
          <div className="flex gap-2">
            <Input
              id="search-end"
              type="date"
              value={values.end}
              min={values.start || todayInput()}
              onChange={(e) => update("end", e.target.value)}
              required
            />
            <Input
              type="time"
              aria-label={t.search.returnTime}
              value={values.endTime}
              onChange={(e) => update("endTime", e.target.value)}
              className="w-[5.5rem] shrink-0 sm:w-[6.5rem]"
              step={1800}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="search-pickup" className="gap-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-navy-500">
            <MapPin className="size-3.5 text-teal-600" />
            {t.search.pickupLocation}
          </Label>
          <NativeSelect
            id="search-pickup"
            value={values.pickupId}
            onChange={(e) => {
              const id = e.target.value;
              setValues((current) => ({
                ...current,
                pickupId: id,
                // Par défaut, on restitue là où l'on a pris le véhicule.
                dropoffId: current.sameLocation ? id : current.dropoffId,
                dropoffText:
                  current.sameLocation && id === CUSTOM_LOCATION
                    ? current.pickupText
                    : current.dropoffText,
              }));
            }}
          >
            {pickupOptions.map((location) => (
              <option key={location.id} value={location.id}>
                {localizedName(location)}
              </option>
            ))}
            <option value={CUSTOM_LOCATION}>{t.search.otherLocation}</option>
          </NativeSelect>

          {values.pickupId === CUSTOM_LOCATION ? (
            <Input
              aria-label={t.search.pickupLocation}
              placeholder={t.search.otherPlaceholder}
              value={values.pickupText}
              onChange={(e) => update("pickupText", e.target.value)}
              maxLength={120}
              autoFocus
            />
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="search-dropoff" className="gap-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-navy-500">
            <MapPin className="size-3.5 text-teal-600" />
            {t.search.returnLocation}
          </Label>
          <NativeSelect
            id="search-dropoff"
            value={values.dropoffId}
            onChange={(e) =>
              setValues((current) => ({
                ...current,
                dropoffId: e.target.value,
                sameLocation: false,
              }))
            }
          >
            {dropoffOptions.map((location) => (
              <option key={location.id} value={location.id}>
                {localizedName(location)}
              </option>
            ))}
            <option value={CUSTOM_LOCATION}>{t.search.otherLocation}</option>
          </NativeSelect>

          {values.dropoffId === CUSTOM_LOCATION ? (
            <Input
              aria-label={t.search.returnLocation}
              placeholder={t.search.otherPlaceholder}
              value={values.dropoffText}
              onChange={(e) => update("dropoffText", e.target.value)}
              maxLength={120}
            />
          ) : null}
        </div>
      </div>

      {values.pickupId === CUSTOM_LOCATION ||
      values.dropoffId === CUSTOM_LOCATION ? (
        <p className="mt-3 text-[12.5px] text-navy-400">{t.search.otherNote}</p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--color-danger)]"
        >
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="mt-6 w-full border-t-0 lg:h-[52px] lg:text-[15px]">
        <Search className="size-4" />
        {t.search.submit}
      </Button>
    </form>
  );
}

export type { SearchValues };
