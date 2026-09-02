import Image from "next/image";
import Link from "next/link";
import { Cog, Fuel, Snowflake, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { vehicleLabels } from "@/i18n/vehicle-labels";
import type { FUEL, TRANSMISSION, VEHICLE_CATEGORY } from "@/lib/labels";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

export type VehicleCardData = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  year: number;
  category: keyof typeof VEHICLE_CATEGORY;
  transmission: keyof typeof TRANSMISSION;
  fuel: keyof typeof FUEL;
  seats: number;
  hasAirConditioning: boolean;
  dailyRate: number;
  images: { url: string; alt: string | null }[];
};

export function VehicleCard({
  vehicle,
  locale,
  t,
  query,
  available,
}: {
  vehicle: VehicleCardData;
  locale: Locale;
  t: Dictionary;
  /** Dates de recherche à propager vers la fiche puis la réservation. */
  query?: string;
  available?: boolean;
}) {
  const image = vehicle.images[0];
  const href = `/${locale}/vehicules/${vehicle.slug}${query ? `?${query}` : ""}`;
  // Libellés dans la langue du visiteur : « Automatique » côté français,
  // « أوتوماتيكية » côté arabe.
  const labels = vehicleLabels(locale);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-navy-100 bg-white shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-navy-200 hover:shadow-[var(--shadow-lift)]">
      <Link
        href={href}
        className="relative block aspect-[16/10] overflow-hidden bg-navy-50"
        tabIndex={-1}
        aria-hidden
      >
        <Image
          src={image?.url ?? "/images/vehicle-placeholder.svg"}
          alt={image?.alt ?? `${vehicle.brand} ${vehicle.model}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3.5">
          <Badge tone="outline" className="bg-white/95 backdrop-blur">
            {labels.category(vehicle.category)}
          </Badge>
          {available ? (
            <Badge tone="success" dot className="bg-white/95 backdrop-blur">
              {t.vehicles.availableForYourDates}
            </Badge>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[17px] font-semibold text-navy-950">
              <Link href={href} className="hover:text-teal-700">
                {vehicle.brand} {vehicle.model}
              </Link>
            </h3>
            <p className="ltr-content mt-0.5 text-[12.5px] text-navy-400">{vehicle.year}</p>
          </div>
          <div className="shrink-0 text-end">
            <p className="ltr-content font-[family-name:var(--font-display)] text-[19px] font-bold leading-none text-navy-950">
              {formatMoney(vehicle.dailyRate)}
            </p>
            <p className="mt-1 text-[11.5px] text-navy-400">{t.common.perDay}</p>
          </div>
        </div>

        <ul className="mb-5 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-navy-600">
          <li className="flex items-center gap-1.5">
            <Cog className="size-3.5 text-navy-300" />
            {labels.transmission(vehicle.transmission)}
          </li>
          <li className="flex items-center gap-1.5">
            <Users className="size-3.5 text-navy-300" />
            {vehicle.seats} {t.vehicles.seats}
          </li>
          <li className="flex items-center gap-1.5">
            <Fuel className="size-3.5 text-navy-300" />
            {labels.fuel(vehicle.fuel)}
          </li>
          {vehicle.hasAirConditioning ? (
            <li className="flex items-center gap-1.5">
              <Snowflake className="size-3.5 text-navy-300" />
              {t.vehicles.airConditioning}
            </li>
          ) : null}
        </ul>

        <div className="mt-auto flex gap-2.5 border-t border-navy-50 pt-4">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={href}>{t.common.seeDetails}</Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link href={`${href}${query ? "&" : "?"}reserver=1`}>
              {t.common.book}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
