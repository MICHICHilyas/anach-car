import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarX2, CarFront } from "lucide-react";
import { getDictionary, interpolate, type Locale } from "@/i18n";
import { isLocale } from "@/i18n/config";
import {
  getPickupLocations,
  getPriceRange,
  searchVehicles,
} from "@/server/queries/vehicles";
import { parsePeriodFromParams, periodQueryString } from "@/lib/search-params";
import { formatDate } from "@/lib/dates";
import { SearchBar } from "@/components/site/search-bar";
import { VehicleCard } from "@/components/site/vehicle-card";
import { VehicleFilters } from "@/components/site/vehicle-filters";
import { SortSelect } from "@/components/site/sort-select";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "fr");
  return {
    title: t.vehicles.title,
    description: t.vehicles.subtitle,
    alternates: {
      canonical: `/${locale}/vehicules`,
      languages: {
        fr: "/fr/vehicules",
        en: "/en/vehicules",
        ar: "/ar/vehicules",
      },
    },
  };
}

export default async function VehiclesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);

  const query = await searchParams;
  const period = parsePeriodFromParams(query);
  const single = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const [{ items, total }, locations, priceRange] = await Promise.all([
    searchVehicles({
      start: period?.start,
      end: period?.end,
      category: single("category"),
      transmission: single("transmission"),
      fuel: single("fuel"),
      seats: single("seats") ? Number(single("seats")) : undefined,
      maxPrice: single("maxPrice") ? Number(single("maxPrice")) : undefined,
      sort: single("sort") as never,
    }),
    getPickupLocations(),
    getPriceRange(),
  ]);

  const carriedQuery = periodQueryString(period, {
    pickup: single("pickup"),
    dropoff: single("dropoff"),
    pickupText: single("pickupText"),
    dropoffText: single("dropoffText"),
  });

  const hasFilters = ["category", "transmission", "fuel", "seats", "maxPrice"].some(
    (key) => single(key),
  );

  return (
    <>
      <section className="border-b border-navy-100 bg-navy-50/40">
        <div className="container-page py-10 lg:py-14">
          <h1 className="text-[2rem] font-semibold tracking-tight text-navy-950 sm:text-[2.5rem]">
            {t.vehicles.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-navy-500">
            {t.vehicles.subtitle}
          </p>

          <div className="mt-8">
            <SearchBar
              locale={locale}
              t={t}
              locations={locations}
              variant="inline"
              defaultValues={{
                ...(period
                  ? {
                      start: period.raw.start,
                      startTime: period.raw.startTime,
                      end: period.raw.end,
                      endTime: period.raw.endTime,
                    }
                  : {}),
                pickupId: single("pickup") ?? locations[0]?.id ?? "",
                dropoffId: single("dropoff") ?? locations[0]?.id ?? "",
                // Une adresse libre doit survivre à la navigation.
                pickupText: single("pickupText") ?? "",
                dropoffText: single("dropoffText") ?? "",
              }}
            />
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        <VehicleFilters
          t={t}
          locale={locale}
          priceRange={priceRange}
          resultCount={total}
        />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-navy-600">
            {period ? (
              <span className="font-medium text-navy-900">
                {interpolate(t.vehicles.resultsFor, {
                  start: formatDate(period.start, locale === "ar" ? "ar-MA" : locale === "en" ? "en-GB" : "fr-MA"),
                  end: formatDate(period.end, locale === "ar" ? "ar-MA" : locale === "en" ? "en-GB" : "fr-MA"),
                })}
              </span>
            ) : (
              interpolate(t.vehicles.availableCount, { count: total })
            )}
          </p>
          <SortSelect t={t} />
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={period ? CalendarX2 : CarFront}
            title={period ? t.vehicles.noResultsForDates : t.vehicles.noResults}
            description={t.vehicles.noResultsHint}
            className="mt-8"
            action={
              <>
                <Button asChild variant="outline">
                  <Link href={`/${locale}/vehicules`}>
                    {hasFilters ? t.vehicles.resetFilters : t.vehicles.changeDates}
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={`/${locale}/contact`}>{t.nav.contact}</Link>
                </Button>
              </>
            }
          />
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                locale={locale}
                t={t}
                query={carriedQuery}
                available={Boolean(period)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
