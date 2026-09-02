"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getQuote, type QuoteResult } from "@/server/actions/booking";
import { formatMoney } from "@/lib/money";
import {
  CUSTOM_LOCATION,
  defaultSearchValues,
  todayInput,
} from "@/lib/search-params";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

type LocationOption = {
  id: string;
  name: string;
  nameEn: string | null;
  nameAr: string | null;
  isPickup: boolean;
  isDropoff: boolean;
};

/**
 * Module de réservation de la fiche véhicule.
 *
 * À chaque changement de dates, il interroge le serveur : disponibilité
 * réelle et prix total sont donc toujours ceux de la base, jamais une
 * estimation calculée dans le navigateur.
 */
export function BookingWidget({
  vehicleId,
  dailyRate,
  locale,
  t,
  locations,
  initialPeriod,
  whatsappHref,
}: {
  vehicleId: string;
  dailyRate: number;
  locale: Locale;
  t: Dictionary;
  locations: LocationOption[];
  initialPeriod?: {
    start: string;
    startTime: string;
    end: string;
    endTime: string;
  };
  whatsappHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<QuoteResult | null>(null);

  const [form, setForm] = useState(() => {
    const defaults = defaultSearchValues();
    return {
      startDate: initialPeriod?.start ?? defaults.start,
      startTime: initialPeriod?.startTime ?? defaults.startTime,
      endDate: initialPeriod?.end ?? defaults.end,
      endTime: initialPeriod?.endTime ?? defaults.endTime,
      pickupLocationId: locations[0]?.id ?? "",
      dropoffLocationId: locations[0]?.id ?? "",
      pickupLocationText: "",
      dropoffLocationText: "",
    };
  });

  // Recalcule le devis dès que la période ou les lieux changent.
  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      const quote = await getQuote({
        vehicleId,
        startDate: form.startDate,
        startTime: form.startTime,
        endDate: form.endDate,
        endTime: form.endTime,
        // L'identifiant fictif « autre adresse » n'existe pas en base : on
        // n'envoie que les lieux réels, qui seuls portent un supplément.
        pickupLocationId:
          form.pickupLocationId === CUSTOM_LOCATION ? null : form.pickupLocationId,
        dropoffLocationId:
          form.dropoffLocationId === CUSTOM_LOCATION ? null : form.dropoffLocationId,
      });
      if (!cancelled) setResult(quote);
    });
    return () => {
      cancelled = true;
    };
  }, [
    vehicleId,
    form.startDate,
    form.startTime,
    form.endDate,
    form.endTime,
    form.pickupLocationId,
    form.dropoffLocationId,
  ]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function goToBooking() {
    const params = new URLSearchParams({
      vehicle: vehicleId,
      start: form.startDate,
      startTime: form.startTime,
      end: form.endDate,
      endTime: form.endTime,
    });
    if (form.pickupLocationId) params.set("pickup", form.pickupLocationId);
    if (form.dropoffLocationId) params.set("dropoff", form.dropoffLocationId);
    if (form.pickupLocationId === CUSTOM_LOCATION && form.pickupLocationText.trim()) {
      params.set("pickupText", form.pickupLocationText.trim());
    }
    if (form.dropoffLocationId === CUSTOM_LOCATION && form.dropoffLocationText.trim()) {
      params.set("dropoffText", form.dropoffLocationText.trim());
    }
    router.push(`/${locale}/reservation?${params.toString()}`);
  }

  const localizedName = (location: LocationOption) =>
    locale === "en"
      ? (location.nameEn ?? location.name)
      : locale === "ar"
        ? (location.nameAr ?? location.name)
        : location.name;

  const available = result?.ok === true && result.available;
  const quote = result?.ok === true ? result.quote : null;

  return (
    <div className="rounded-[var(--radius-card)] border border-navy-100 bg-white shadow-[var(--shadow-lift)]">
      <div className="border-b border-navy-100 px-5 py-4">
        <p className="flex items-baseline gap-1.5">
          <span className="ltr-inline font-[family-name:var(--font-display)] text-[26px] font-bold tracking-tight text-navy-950">
            {formatMoney(dailyRate)}
          </span>
          <span className="text-[13px] text-navy-400">{t.common.perDay}</span>
        </p>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="booking-start" className="gap-1.5">
              <CalendarDays className="size-3.5 text-teal-600" />
              {t.search.pickupDate}
            </Label>
            <Input
              id="booking-start"
              type="date"
              min={todayInput()}
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
            />
            <Input
              type="time"
              aria-label={t.search.pickupTime}
              step={1800}
              value={form.startTime}
              onChange={(e) => update("startTime", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="booking-end" className="gap-1.5">
              <CalendarDays className="size-3.5 text-teal-600" />
              {t.search.returnDate}
            </Label>
            <Input
              id="booking-end"
              type="date"
              min={form.startDate}
              value={form.endDate}
              onChange={(e) => update("endDate", e.target.value)}
            />
            <Input
              type="time"
              aria-label={t.search.returnTime}
              step={1800}
              value={form.endTime}
              onChange={(e) => update("endTime", e.target.value)}
            />
          </div>
        </div>

        {locations.length > 0 ? (
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="booking-pickup" className="gap-1.5">
                <MapPin className="size-3.5 text-teal-600" />
                {t.search.pickupLocation}
              </Label>
              <NativeSelect
                id="booking-pickup"
                value={form.pickupLocationId}
                onChange={(e) => {
                  const id = e.target.value;
                  setForm((current) => ({
                    ...current,
                    pickupLocationId: id,
                    dropoffLocationId:
                      current.dropoffLocationId === current.pickupLocationId
                        ? id
                        : current.dropoffLocationId,
                  }));
                }}
              >
                {locations
                  .filter((location) => location.isPickup)
                  .map((location) => (
                    <option key={location.id} value={location.id}>
                      {localizedName(location)}
                    </option>
                  ))}
                <option value={CUSTOM_LOCATION}>{t.search.otherLocation}</option>
              </NativeSelect>

              {form.pickupLocationId === CUSTOM_LOCATION ? (
                <Input
                  aria-label={t.search.pickupLocation}
                  placeholder={t.search.otherPlaceholder}
                  value={form.pickupLocationText}
                  onChange={(e) => update("pickupLocationText", e.target.value)}
                  maxLength={120}
                />
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="booking-dropoff" className="gap-1.5">
                <MapPin className="size-3.5 text-teal-600" />
                {t.search.returnLocation}
              </Label>
              <NativeSelect
                id="booking-dropoff"
                value={form.dropoffLocationId}
                onChange={(e) => update("dropoffLocationId", e.target.value)}
              >
                {locations
                  .filter((location) => location.isDropoff)
                  .map((location) => (
                    <option key={location.id} value={location.id}>
                      {localizedName(location)}
                    </option>
                  ))}
                <option value={CUSTOM_LOCATION}>{t.search.otherLocation}</option>
              </NativeSelect>

              {form.dropoffLocationId === CUSTOM_LOCATION ? (
                <Input
                  aria-label={t.search.returnLocation}
                  placeholder={t.search.otherPlaceholder}
                  value={form.dropoffLocationText}
                  onChange={(e) => update("dropoffLocationText", e.target.value)}
                  maxLength={120}
                />
              ) : null}

              {form.pickupLocationId === CUSTOM_LOCATION ||
              form.dropoffLocationId === CUSTOM_LOCATION ? (
                <p className="text-[12px] leading-relaxed text-navy-400">
                  {t.search.otherNote}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ---------------- Résultat du calcul serveur ---------------- */}
        <div aria-live="polite" className="min-h-[4rem]">
          {pending ? (
            <p className="flex items-center gap-2 rounded-lg bg-navy-50 px-3.5 py-3 text-[13px] text-navy-500">
              <Loader2 className="size-4 animate-spin" />
              {t.common.loading}
            </p>
          ) : result?.ok === false ? (
            <p className="flex items-start gap-2 rounded-lg bg-[var(--color-warning-soft)] px-3.5 py-3 text-[13px] font-medium text-[var(--color-warning)]">
              <AlertTriangle className="mt-px size-4 shrink-0" />
              {result.error}
            </p>
          ) : result?.ok === true && !result.available ? (
            <div className="rounded-lg bg-[var(--color-danger-soft)] px-3.5 py-3">
              <p className="flex items-start gap-2 text-[13px] font-semibold text-[var(--color-danger)]">
                <AlertTriangle className="mt-px size-4 shrink-0" />
                {t.vehicleDetail.notAvailableForPeriod}
              </p>
              {result.conflicts.length > 0 ? (
                <ul className="mt-2 space-y-1 ps-6 text-[12.5px] text-[var(--color-danger)]/85">
                  {result.conflicts.map((conflict, index) => (
                    <li key={index}>
                      {t.common.from} {conflict.from} {t.common.to} {conflict.to}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : quote ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 rounded-lg bg-[var(--color-success-soft)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-success)]">
                <CheckCircle2 className="size-4 shrink-0" />
                {t.vehicleDetail.availableForPeriod}
              </p>

              <dl className="space-y-2 text-[13.5px]">
                {quote.lines.map((line, index) => (
                  <div key={index} className="flex items-baseline justify-between gap-3">
                    <dt className="text-navy-500">
                      {line.label}
                      {line.detail ? (
                        <span className="text-navy-400"> · {line.detail}</span>
                      ) : null}
                    </dt>
                    <dd
                      className={cn(
                        "ltr-content shrink-0 font-medium tabular-nums",
                        line.kind === "discount"
                          ? "text-[var(--color-success)]"
                          : "text-navy-800",
                      )}
                    >
                      {formatMoney(line.amount)}
                    </dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-3 border-t border-navy-100 pt-2.5">
                  <dt className="font-semibold text-navy-900">
                    {t.vehicleDetail.estimatedTotal}
                  </dt>
                  <dd className="ltr-content font-[family-name:var(--font-display)] text-[19px] font-bold tabular-nums text-navy-950">
                    {formatMoney(quote.total)}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={goToBooking}
          disabled={pending || !available}
        >
          {t.vehicleDetail.bookThisCar}
        </Button>

        <Button asChild variant="outline" className="w-full">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4 text-[#25D366]" />
            {t.vehicleDetail.askOnWhatsapp}
          </a>
        </Button>

        <p className="text-center text-[12px] leading-relaxed text-navy-400">
          {t.booking.summary.paymentNote}
        </p>
      </div>
    </div>
  );
}
