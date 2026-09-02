import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import { getDictionary, type Locale } from "@/i18n";
import { isLocale } from "@/i18n/config";
import { db } from "@/lib/db";
import { getQuote } from "@/server/actions/booking";
import { CUSTOM_LOCATION, parsePeriodFromParams } from "@/lib/search-params";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { vehicleLabels } from "@/i18n/vehicle-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookingForm } from "@/components/site/booking-form";
import { cn } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

export const metadata: Metadata = {
  title: "Réservation",
  robots: { index: false, follow: false },
};

export default async function ReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const t = getDictionary(locale);

  const query = await searchParams;
  const single = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const vehicleId = single("vehicle");
  const period = parsePeriodFromParams(query);

  // Sans véhicule ni dates, la page n'a pas de sens : on renvoie au catalogue.
  if (!vehicleId || !period) redirect(`/${locale}/vehicules`);

  const vehicle = await db.vehicle.findFirst({
    where: { id: vehicleId, archivedAt: null },
    select: {
      id: true,
      slug: true,
      brand: true,
      model: true,
      year: true,
      category: true,
      images: {
        select: { url: true, alt: true },
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        take: 1,
      },
    },
  });
  if (!vehicle) redirect(`/${locale}/vehicules`);

  /*
   * Le lieu peut être un enregistrement de la base ou une adresse saisie
   * librement par le client. Dans le second cas, aucun identifiant n'est
   * transmis : seul le texte compte.
   */
  const pickupRaw = single("pickup") ?? null;
  const dropoffRaw = single("dropoff") ?? null;
  const pickupText = single("pickupText")?.trim() || null;
  const dropoffText = single("dropoffText")?.trim() || null;
  const pickupId = pickupRaw === CUSTOM_LOCATION ? null : pickupRaw;
  const dropoffId = dropoffRaw === CUSTOM_LOCATION ? null : dropoffRaw;

  // Le devis est recalculé côté serveur : il ne vient jamais de l'URL.
  const quote = await getQuote({
    vehicleId: vehicle.id,
    startDate: period.raw.start,
    startTime: period.raw.startTime,
    endDate: period.raw.end,
    endTime: period.raw.endTime,
    pickupLocationId: pickupId,
    dropoffLocationId: dropoffId,
  });

  const label = `${vehicle.brand} ${vehicle.model}`;
  const locations = await db.location.findMany({
    where: { id: { in: [pickupId, dropoffId].filter((id): id is string => Boolean(id)) } },
    select: { id: true, name: true },
  });
  const labelFor = (id: string | null, text: string | null) =>
    text ?? locations.find((location) => location.id === id)?.name ?? null;

  const pickupLabel = labelFor(pickupId, pickupText);
  const dropoffLabel = labelFor(dropoffId, dropoffText);
  const hasCustomLocation = Boolean(pickupText || dropoffText);

  const unavailable = quote.ok && !quote.available;

  return (
    <div className="container-page py-10 lg:py-14">
      <div className="max-w-2xl">
        <h1 className="text-[2rem] font-semibold tracking-tight text-navy-950 sm:text-[2.4rem]">
          {t.booking.title}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-navy-500">
          {t.booking.subtitle} {t.booking.noAccountNeeded}
        </p>
      </div>

      {!quote.ok || unavailable ? (
        <div className="mt-8 max-w-2xl rounded-[var(--radius-card)] border border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] p-6">
          <p className="flex items-start gap-3 text-[14px] font-semibold text-[var(--color-danger)]">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            {quote.ok ? t.errors.vehicleUnavailable : quote.error}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button asChild variant="outline">
              <Link href={`/${locale}/vehicules/${vehicle.slug}`}>
                {t.vehicleDetail.checkAvailability}
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/${locale}/vehicules`}>
                {t.vehicleDetail.seeOtherVehicles}
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
          <BookingForm
            locale={locale}
            t={t}
            vehicleId={vehicle.id}
            period={period.raw}
            pickupLocationId={pickupId ?? undefined}
            dropoffLocationId={dropoffId ?? undefined}
            pickupLocationText={pickupText ?? undefined}
            dropoffLocationText={dropoffText ?? undefined}
          />

          {/* ------------------------ Récapitulatif ------------------------ */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-[var(--radius-card)] border border-navy-100 bg-white shadow-[var(--shadow-soft)]">
              <div className="relative aspect-[16/9] bg-navy-50">
                <Image
                  src={vehicle.images[0]?.url ?? "/images/vehicle-placeholder.svg"}
                  alt={vehicle.images[0]?.alt ?? label}
                  fill
                  sizes="400px"
                  className="object-cover"
                />
              </div>

              <div className="p-5">
                <Badge tone="teal">{vehicleLabels(locale).category(vehicle.category)}</Badge>
                <h2 className="mt-3 text-[17px] font-semibold text-navy-950">
                  {label}
                </h2>
                <p className="text-[12.5px] text-navy-400">{vehicle.year}</p>

                <dl className="mt-5 space-y-3 border-t border-navy-100 pt-5 text-[13.5px]">
                  <div className="flex gap-3">
                    <CalendarDays className="mt-0.5 size-4 shrink-0 text-navy-300" />
                    <div>
                      <dt className="text-navy-400">{t.booking.summary.period}</dt>
                      <dd className="ltr-content mt-0.5 font-medium text-navy-900">
                        {formatDateTime(period.start)}
                      </dd>
                      <dd className="ltr-content font-medium text-navy-900">
                        {formatDateTime(period.end)}
                      </dd>
                    </div>
                  </div>

                  {pickupLabel ? (
                    <div className="flex gap-3">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-navy-300" />
                      <div>
                        <dt className="text-navy-400">{t.booking.summary.pickup}</dt>
                        <dd className="mt-0.5 font-medium text-navy-900">
                          {pickupLabel}
                        </dd>
                        {dropoffLabel && dropoffLabel !== pickupLabel ? (
                          <>
                            <dt className="mt-2 text-navy-400">
                              {t.booking.summary.dropoff}
                            </dt>
                            <dd className="mt-0.5 font-medium text-navy-900">
                              {dropoffLabel}
                            </dd>
                          </>
                        ) : null}
                        {hasCustomLocation ? (
                          <dd className="mt-1.5 text-[12px] leading-relaxed text-navy-400">
                            {t.search.otherNote}
                          </dd>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </dl>

                <dl className="mt-5 space-y-2.5 border-t border-navy-100 pt-5 text-[13.5px]">
                  {quote.quote?.lines.map((line, index) => (
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

                  <div className="flex items-baseline justify-between gap-3 border-t border-navy-100 pt-3">
                    <dt className="font-semibold text-navy-900">
                      {t.booking.summary.total}
                    </dt>
                    <dd className="ltr-content font-[family-name:var(--font-display)] text-[21px] font-bold tabular-nums text-navy-950">
                      {formatMoney(quote.quote?.total ?? 0)}
                    </dd>
                  </div>

                </dl>

                <p className="mt-5 flex items-start gap-2.5 rounded-lg bg-teal-50/70 px-3.5 py-3 text-[12.5px] leading-relaxed text-teal-900">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-600" />
                  {t.booking.summary.paymentNote}
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
