import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CalendarClock,
  Check,
  Cog,
  DoorOpen,
  Fuel,
  Gauge,
  ShieldCheck,
  Snowflake,
  Users,
} from "lucide-react";
import { getDictionary, type Locale } from "@/i18n";
import { isLocale } from "@/i18n/config";
import {
  getPickupLocations,
  getSimilarVehicles,
  getVehicleBySlug,
} from "@/server/queries/vehicles";
import { getBlockedPeriods } from "@/lib/availability";
import { parsePeriodFromParams, periodQueryString } from "@/lib/search-params";
import { addDays, formatDate, formatDateShort } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { vehicleLabels } from "@/i18n/vehicle-labels";
import { FUEL, TRANSMISSION } from "@/lib/labels";
import { whatsappForVehicle } from "@/lib/whatsapp";
import { AGENCY } from "@/config/agency";
import { Badge } from "@/components/ui/badge";
import { VehicleGallery } from "@/components/site/vehicle-gallery";
import { BookingWidget } from "@/components/site/booking-widget";
import { VehicleCard } from "@/components/site/vehicle-card";

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) return { title: "Véhicule introuvable" };

  const label = `${vehicle.brand} ${vehicle.model} ${vehicle.year}`;
  const description = `Louez une ${label} à Agadir, Inezgane et Dcheira à partir de ${formatMoney(
    vehicle.dailyRate,
  )} par jour. ${TRANSMISSION[vehicle.transmission]}, ${FUEL[vehicle.fuel]}, ${vehicle.seats} places.`;

  return {
    title: `Location ${label}`,
    description,
    alternates: { canonical: `/${locale}/vehicules/${slug}` },
    openGraph: {
      title: `Location ${label} — ${AGENCY.name}`,
      description,
      images: vehicle.images[0]?.url ? [vehicle.images[0].url] : undefined,
    },
  };
}

export default async function VehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const t = getDictionary(locale);

  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) notFound();

  const query = await searchParams;
  const period = parsePeriodFromParams(query);

  const [locations, similar, blocked] = await Promise.all([
    getPickupLocations(),
    getSimilarVehicles(vehicle.id, vehicle.category, 3),
    getBlockedPeriods(vehicle.id, new Date(), addDays(new Date(), 120)),
  ]);

  const label = `${vehicle.brand} ${vehicle.model}`;
  const labels = vehicleLabels(locale);
  const description =
    locale === "en"
      ? (vehicle.descriptionEn ?? vehicle.descriptionFr)
      : locale === "ar"
        ? (vehicle.descriptionAr ?? vehicle.descriptionFr)
        : vehicle.descriptionFr;

  const specs = [
    {
      icon: Cog,
      label: t.vehicles.transmission,
      value: labels.transmission(vehicle.transmission),
    },
    { icon: Fuel, label: t.vehicles.fuel, value: labels.fuel(vehicle.fuel) },
    { icon: Users, label: t.vehicles.seats, value: String(vehicle.seats) },
    { icon: DoorOpen, label: t.vehicles.doors, value: String(vehicle.doors) },
    { icon: Calendar, label: t.vehicles.year, value: String(vehicle.year) },
    {
      icon: Gauge,
      label: t.vehicles.mileage,
      value: `${vehicle.mileage.toLocaleString("fr-MA")} km`,
    },
    ...(vehicle.hasAirConditioning
      ? [{ icon: Snowflake, label: t.vehicles.airConditioning, value: t.common.yes }]
      : []),
  ];

  const rates = [
    { label: t.vehicleDetail.dailyRate, value: vehicle.dailyRate },
    { label: t.vehicleDetail.rate3Days, value: vehicle.rate3Days },
    { label: t.vehicleDetail.weeklyRate, value: vehicle.weeklyRate },
    { label: t.vehicleDetail.monthlyRate, value: vehicle.monthlyRate },
  ].filter((rate): rate is { label: string; value: number } => Boolean(rate.value));

  // Données structurées : aide Google à afficher le véhicule et son prix.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${label} ${vehicle.year}`,
    description: description ?? undefined,
    brand: { "@type": "Brand", name: vehicle.brand },
    image: vehicle.images.map((image) => image.url),
    offers: {
      "@type": "Offer",
      price: (vehicle.dailyRate / 100).toFixed(2),
      priceCurrency: "MAD",
      availability: "https://schema.org/InStock",
      seller: { "@type": "AutoRental", name: AGENCY.name },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container-page py-8 lg:py-12">
        <Link
          href={`/${locale}/vehicules?${periodQueryString(period)}`}
          className="inline-flex items-center gap-2 text-[13.5px] font-medium text-navy-500 transition-colors hover:text-navy-900"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {t.vehicleDetail.backToList}
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
          {/* ------------------- Colonne principale ------------------- */}
          <div>
            <VehicleGallery images={vehicle.images} alt={label} />

            <div className="mt-8">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge tone="teal">{labels.category(vehicle.category)}</Badge>
                <span className="text-[13px] text-navy-400">{vehicle.year}</span>
              </div>
              <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-navy-950 sm:text-[2.4rem]">
                {label}
              </h1>
              {description ? (
                <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-navy-600">
                  {description}
                </p>
              ) : null}
            </div>

            {/* Caractéristiques */}
            <section className="mt-10">
              <h2 className="text-[17px] font-semibold text-navy-950">
                {t.vehicleDetail.specifications}
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="rounded-xl border border-navy-100 bg-white px-4 py-3.5"
                  >
                    <dt className="flex items-center gap-2 text-[12px] text-navy-400">
                      <spec.icon className="size-3.5" />
                      {spec.label}
                    </dt>
                    <dd className="ltr-content mt-1 text-[14.5px] font-semibold text-navy-900">
                      {spec.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Équipements */}
            {vehicle.features.length > 0 ? (
              <section className="mt-10">
                <h2 className="text-[17px] font-semibold text-navy-950">
                  {t.vehicleDetail.features}
                </h2>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {vehicle.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2.5 text-[14px] text-navy-700"
                    >
                      <Check className="size-4 shrink-0 text-teal-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Tarifs */}
            <section className="mt-10">
              <h2 className="text-[17px] font-semibold text-navy-950">
                {t.vehicleDetail.pricing}
              </h2>
              <div className="mt-4 overflow-hidden rounded-[var(--radius-card)] border border-navy-100">
                <table className="w-full text-[14px]">
                  <tbody>
                    {rates.map((rate, index) => (
                      <tr
                        key={rate.label}
                        className={index % 2 ? "bg-navy-50/40" : "bg-white"}
                      >
                        <td className="px-4 py-3 text-navy-600">{rate.label}</td>
                        <td className="px-4 py-3 text-end font-semibold tabular-nums text-navy-900">
                          <span className="ltr-inline">
                            {formatMoney(rate.value)}
                          </span>
                          <span className="ms-1 text-[12px] font-normal text-navy-400">
                            {t.common.perDay}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Périodes déjà réservées */}
            {blocked.length > 0 ? (
              <section className="mt-10">
                <h2 className="flex items-center gap-2 text-[17px] font-semibold text-navy-950">
                  <CalendarClock className="size-4 text-navy-400" />
                  {t.vehicleDetail.unavailablePeriods}
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2.5">
                  {blocked.slice(0, 8).map((conflict, index) => (
                    <li
                      key={index}
                      className="rounded-lg border border-navy-100 bg-navy-50/60 px-3.5 py-2 text-[13px] text-navy-600"
                    >
                      <span className="ltr-inline">
                        {formatDateShort(conflict.from)} → {formatDateShort(conflict.to)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Conditions de location */}
            <section className="mt-10">
              <h2 className="text-[17px] font-semibold text-navy-950">
                {t.vehicleDetail.conditions}
              </h2>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {Object.values(t.vehicleDetail.conditionsList).map((condition) => (
                  <li
                    key={condition}
                    className="flex items-start gap-2.5 text-[14px] text-navy-700"
                  >
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-600" />
                    {condition}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* ------------------- Module de réservation ------------------- */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <BookingWidget
              vehicleId={vehicle.id}
              dailyRate={vehicle.dailyRate}
              locale={locale}
              t={t}
              locations={locations}
              initialPeriod={period?.raw}
              whatsappHref={whatsappForVehicle({
                brand: vehicle.brand,
                model: vehicle.model,
                startLabel: period ? formatDate(period.start) : undefined,
                endLabel: period ? formatDate(period.end) : undefined,
              })}
            />
          </aside>
        </div>

        {/* ------------------- Véhicules similaires ------------------- */}
        {similar.length > 0 ? (
          <section className="mt-20">
            <h2 className="text-[1.6rem] font-semibold tracking-tight text-navy-950">
              {t.vehicleDetail.similar}
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((item) => (
                <VehicleCard
                  key={item.id}
                  vehicle={item}
                  locale={locale}
                  t={t}
                  query={periodQueryString(period)}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
