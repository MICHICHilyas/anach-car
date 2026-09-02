import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck,
  Car,
  Headphones,
  MapPin,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { getDictionary, type Locale } from "@/i18n";
import { isLocale } from "@/i18n/config";
import { AGENCY } from "@/config/agency";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "fr");
  return {
    title: t.nav.about,
    description: t.about.intro,
    alternates: { canonical: `/${locale}/a-propos` },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);

  // Chiffres réels tirés de la base, jamais inventés.
  const [fleetSize, categories] = await Promise.all([
    db.vehicle.count({ where: { archivedAt: null } }),
    db.vehicle.groupBy({
      by: ["category"],
      where: { archivedAt: null },
      _count: true,
    }),
  ]);

  const values = [
    { icon: Wrench, title: t.about.values.fleetTitle, text: t.about.values.fleetText },
    { icon: CalendarCheck, title: t.about.values.simpleTitle, text: t.about.values.simpleText },
    { icon: ShieldCheck, title: t.about.values.transparentTitle, text: t.about.values.transparentText },
    { icon: Headphones, title: t.about.values.supportTitle, text: t.about.values.supportText },
  ];

  return (
    <>
      <section className="surface-deep">
        <div className="container-page py-16 lg:py-24">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-teal-300">
            {AGENCY.city} · {AGENCY.country}
          </p>
          <h1 className="mt-5 max-w-3xl text-balance text-[2.2rem] font-semibold leading-[1.1] tracking-tight text-white sm:text-[3rem]">
            {t.about.title}
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-navy-300">
            {t.about.intro}
          </p>
        </div>
      </section>

      <section className="container-page py-14 lg:py-20">
        <dl className="grid gap-6 sm:grid-cols-2">
          {values.map((value) => (
            <div
              key={value.title}
              className="rounded-[var(--radius-card)] border border-navy-100 bg-white p-7 shadow-[var(--shadow-soft)]"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <value.icon className="size-5" />
              </span>
              <dt className="mt-5 text-[17px] font-semibold text-navy-950">
                {value.title}
              </dt>
              <dd className="mt-2 text-[14.5px] leading-relaxed text-navy-500">
                {value.text}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="container-page pb-14 lg:pb-20">
        <div className="rounded-[1.5rem] bg-sand-50 px-6 py-12 sm:px-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-[1.75rem] font-semibold tracking-tight text-navy-950">
                {t.about.fleetTitle}
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-navy-600">
                {t.about.fleetText}
              </p>
              <Button asChild className="mt-7">
                <Link href={`/${locale}/vehicules`}>
                  {t.common.viewAll}
                  <ArrowRight className="size-4 rtl:rotate-180" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Stat
                icon={Car}
                value={String(fleetSize)}
                label={locale === "en" ? "cars in the fleet" : locale === "ar" ? "سيارة في الأسطول" : "véhicules en flotte"}
              />
              <Stat
                icon={MapPin}
                value={String(categories.length)}
                label={locale === "en" ? "categories" : locale === "ar" ? "فئات" : "catégories"}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] bg-white p-6 text-center shadow-[var(--shadow-soft)]">
      <Icon className="mx-auto size-5 text-teal-600" />
      <p className="mt-3 font-[family-name:var(--font-display)] text-[2rem] font-bold leading-none tracking-tight text-navy-950">
        {value}
      </p>
      <p className="mt-2 text-[12.5px] text-navy-500">{label}</p>
    </div>
  );
}
