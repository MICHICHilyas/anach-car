import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarCheck,
  CarFront,
  Headphones,
  KeyRound,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { getDictionary, type Locale } from "@/i18n";
import { isLocale } from "@/i18n/config";
import { AGENCY } from "@/config/agency";
import { getFeaturedVehicles, getPickupLocations } from "@/server/queries/vehicles";
import { SearchBar } from "@/components/site/search-bar";
import { TrustStrip } from "@/components/site/trust-strip";
import { Testimonials } from "@/components/site/testimonials";
import { Reveal } from "@/components/ui/reveal";
import { HeroSlider, type HeroSlide } from "@/components/site/hero-slider";
import { assignHeroImages, HERO_SLIDE_COUNT } from "@/config/hero";
import { vehicleLabels } from "@/i18n/vehicle-labels";
import { defaultSearchValues } from "@/lib/search-params";
import { VehicleCard } from "@/components/site/vehicle-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "fr");
  return {
    title: `${t.meta.siteName} — ${t.meta.tagline}`,
    description: t.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: { fr: "/fr", en: "/en", ar: "/ar" },
    },
    openGraph: {
      title: `${t.meta.siteName} — ${t.meta.tagline}`,
      description: t.meta.description,
      type: "website",
      locale,
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);

  const [vehicles, locations] = await Promise.all([
    getFeaturedVehicles(6),
    getPickupLocations(),
  ]);

  /*
   * Véhicules mis en avant dans le Hero. Les libellés sont traduits ici :
   * le composant client reçoit du texte prêt à afficher, pas des énumérations.
   * L'image est celle du véhicule dès que l'agence en téléverse une, sinon
   * le visuel de sa catégorie (voir src/config/hero.ts).
   */
  const labels = vehicleLabels(locale);

  const heroSlides: HeroSlide[] = assignHeroImages(
    vehicles.slice(0, HERO_SLIDE_COUNT),
  ).map((vehicle) => ({
    id: vehicle.id,
    slug: vehicle.slug,
    brand: vehicle.brand,
    model: vehicle.model,
    dailyRate: vehicle.dailyRate,
    transmission: labels.transmission(vehicle.transmission),
    fuel: labels.fuel(vehicle.fuel),
    seats: vehicle.seats,
    hasAirConditioning: vehicle.hasAirConditioning,
    image: vehicle.heroImage,
    categoryLabel: labels.category(vehicle.category),
    isRealPhoto: vehicle.heroIsRealPhoto,
  }));

  const defaults = {
    ...defaultSearchValues(),
    pickupId: locations[0]?.id ?? "",
    dropoffId: locations[0]?.id ?? "",
  };

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      {heroSlides.length > 0 ? (
        <HeroSlider slides={heroSlides} locale={locale} t={t} />
      ) : null}

      {/* -------- Moteur de recherche, à cheval sur le hero -------- */}
      <section className="container-page relative z-10 -mt-24 lg:-mt-28">
        <SearchBar
          locale={locale}
          t={t}
          locations={locations}
          defaultValues={defaults}
        />
      </section>

      {/* Réassurance, au moment précis où le visiteur hésite à réserver */}
      <TrustStrip t={t} />

      {/* ---------------- Véhicules mis en avant ---------------- */}
      <section className="container-page mt-20 lg:mt-28">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight text-navy-950 sm:text-[2.15rem]">
              {t.vehicles.title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-navy-500">
              {t.vehicles.subtitle}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/vehicules`}>
              {t.common.viewAll}
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          </Button>
        </Reveal>

        {vehicles.length === 0 ? (
          <EmptyState
            icon={CarFront}
            title={t.vehicles.noResults}
            description={t.vehicles.noResultsHint}
            className="mt-10"
          />
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle, index) => (
              <Reveal key={vehicle.id} delay={index * 70}>
                <VehicleCard vehicle={vehicle} locale={locale} t={t} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ---------------- Comment ça marche ---------------- */}
      <section className="container-page mt-24 lg:mt-32">
        <Reveal className="rounded-[1.5rem] bg-sand-50 px-6 py-14 sm:px-12 lg:px-16">
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-navy-950">
            Réserver chez Anach Car, en trois étapes
          </h2>

          <ol className="mt-12 grid gap-10 sm:grid-cols-3">
            {[
              {
                icon: CalendarCheck,
                title: "Choisissez vos dates",
                text: "Indiquez votre période et découvrez immédiatement les véhicules réellement disponibles.",
              },
              {
                icon: CarFront,
                title: "Sélectionnez votre véhicule",
                text: "Comparez les modèles, les équipements et les tarifs. Le prix total s'affiche avant l'envoi.",
              },
              {
                icon: KeyRound,
                title: "Récupérez les clés",
                text: "Nous confirmons votre demande, puis vous remettons le véhicule avec CIN et permis.",
              },
            ].map((step, index) => (
              <li key={step.title} className="relative">
                <span className="flex size-11 items-center justify-center rounded-xl bg-white text-teal-700 shadow-[var(--shadow-soft)]">
                  <step.icon className="size-5" />
                </span>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">
                  Étape {index + 1}
                </p>
                <h3 className="mt-2 text-[17px] font-semibold text-navy-950">
                  {step.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-navy-500">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      {/* ---------------- Engagements ---------------- */}
      <section className="container-page mt-24 lg:mt-32">
        <Reveal className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-navy-950 sm:text-[2.15rem]">
              {t.about.title}
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-navy-500">
              {t.about.intro}
            </p>
            <Button asChild variant="navy" className="mt-8">
              <Link href={`/${locale}/a-propos`}>
                {t.nav.about}
                <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
            </Button>
          </div>

          <dl className="grid gap-5 sm:grid-cols-2">
            {[
              {
                icon: Wrench,
                title: t.about.values.fleetTitle,
                text: t.about.values.fleetText,
              },
              {
                icon: CalendarCheck,
                title: t.about.values.simpleTitle,
                text: t.about.values.simpleText,
              },
              {
                icon: ShieldCheck,
                title: t.about.values.transparentTitle,
                text: t.about.values.transparentText,
              },
              {
                icon: Headphones,
                title: t.about.values.supportTitle,
                text: t.about.values.supportText,
              },
            ].map((value) => (
              <div
                key={value.title}
                className="rounded-[var(--radius-card)] border border-navy-100 bg-white p-6 shadow-[var(--shadow-soft)]"
              >
                <value.icon className="size-5 text-teal-600" />
                <dt className="mt-4 text-[15px] font-semibold text-navy-950">
                  {value.title}
                </dt>
                <dd className="mt-1.5 text-[13.5px] leading-relaxed text-navy-500">
                  {value.text}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      {/* ---------------- Avis clients ---------------- */}
      <Testimonials locale={locale} t={t} />

      {/* ---------------- Bandeau de contact ---------------- */}
      <section className="container-page mt-24">
        <Reveal className="surface-deep flex flex-col items-start justify-between gap-8 rounded-[1.5rem] px-8 py-12 sm:px-12 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <h2 className="text-[1.75rem] font-semibold tracking-tight text-white">
              {t.about.ctaTitle}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-navy-300">
              {t.about.ctaText}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={`/${locale}/vehicules`}>{t.common.viewAll}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:border-teal-400 hover:bg-white/10"
            >
              <a href={`tel:${AGENCY.phone.mobileHref}`}>
                <span className="ltr-content">{AGENCY.phone.mobile}</span>
              </a>
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
