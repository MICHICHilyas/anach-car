import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  MessageCircle,
  Phone,
  SearchX,
} from "lucide-react";
import { getDictionary, type Locale } from "@/i18n";
import { isLocale } from "@/i18n/config";
import { db } from "@/lib/db";
import { verifyReferenceToken } from "@/lib/tokens";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { RESERVATION_STATUS } from "@/lib/labels";
import { whatsappForReservation } from "@/lib/whatsapp";
import { getAgencyContact } from "@/lib/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type SearchParams = Record<string, string | string[] | undefined>;

export const metadata: Metadata = {
  title: "Confirmation de réservation",
  robots: { index: false, follow: false },
};

export default async function ConfirmationPage({
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

  const reference = single("ref");
  const token = single("t");

  // Les références sont séquentielles : sans jeton valide, on ne révèle rien.
  const authorized = reference ? verifyReferenceToken(reference, token) : false;

  const reservation = authorized
    ? await db.reservation.findUnique({
        where: { reference: reference! },
        select: {
          reference: true,
          startAt: true,
          endAt: true,
          days: true,
          totalAmount: true,
          status: true,
          pickupLocationLabel: true,
          dropoffLocationLabel: true,
          customer: { select: { firstName: true } },
          vehicle: { select: { brand: true, model: true, year: true } },
        },
      })
    : null;

  if (!reservation) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={SearchX}
          title={t.confirmation.notFound}
          description={t.confirmation.notFoundHint}
          action={
            <>
              <Button asChild variant="outline">
                <Link href={`/${locale}`}>{t.confirmation.backHome}</Link>
              </Button>
              <Button asChild>
                <Link href={`/${locale}/contact`}>{t.nav.contact}</Link>
              </Button>
            </>
          }
        />
      </div>
    );
  }

  const [agency, whatsappHref] = await Promise.all([
    getAgencyContact(),
    whatsappForReservation({
      reference: reservation.reference,
      brand: reservation.vehicle.brand,
      model: reservation.vehicle.model,
      startLabel: formatDateTime(reservation.startAt),
      endLabel: formatDateTime(reservation.endAt),
    }),
  ]);

  const status = RESERVATION_STATUS[reservation.status];
  const vehicleLabel = `${reservation.vehicle.brand} ${reservation.vehicle.model}`;

  return (
    <div className="container-page py-12 lg:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-[var(--color-success-soft)]">
            <CheckCircle2 className="size-8 text-[var(--color-success)]" />
          </span>
          <h1 className="mt-6 text-balance text-[1.9rem] font-semibold leading-tight tracking-tight text-navy-950 sm:text-[2.3rem]">
            {t.confirmation.title}
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-navy-500">
            {t.confirmation.subtitle}
          </p>
        </div>

        {/* ------------------- Récapitulatif ------------------- */}
        <div className="mt-10 overflow-hidden rounded-[var(--radius-card)] border border-navy-100 bg-white shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-navy-100 bg-navy-50/50 px-6 py-5">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-navy-400">
                {t.confirmation.reference}
              </p>
              <p className="ltr-content mt-1 font-[family-name:var(--font-display)] text-[21px] font-bold tracking-tight text-navy-950">
                {reservation.reference}
              </p>
            </div>
            <div className="text-end">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-navy-400">
                {t.confirmation.status}
              </p>
              <Badge tone={status.tone} dot className="mt-1.5">
                {reservation.status === "PENDING"
                  ? t.confirmation.pendingStatus
                  : status.label}
              </Badge>
            </div>
          </div>

          <dl className="divide-y divide-navy-50 px-6">
            <Row
              icon={Car}
              label={t.booking.summary.vehicle}
              value={`${vehicleLabel} (${reservation.vehicle.year})`}
            />
            <Row
              icon={CalendarDays}
              label={t.booking.summary.period}
              value={`${formatDateTime(reservation.startAt)} → ${formatDateTime(reservation.endAt)}`}
            />
            <Row
              icon={Clock}
              label={t.booking.summary.duration}
              value={`${reservation.days} ${reservation.days > 1 ? t.common.days : t.common.day}`}
            />
            {reservation.pickupLocationLabel ? (
              <Row
                icon={CalendarDays}
                label={t.booking.summary.pickup}
                value={reservation.pickupLocationLabel}
              />
            ) : null}
          </dl>

          <div className="flex items-baseline justify-between gap-4 border-t border-navy-100 bg-navy-50/50 px-6 py-5">
            <span className="text-[14px] font-semibold text-navy-900">
              {t.booking.summary.total}
            </span>
            <span className="font-[family-name:var(--font-display)] text-[24px] font-bold tabular-nums text-navy-950">
              {formatMoney(reservation.totalAmount)}
            </span>
          </div>
        </div>

        {/* ------------------- Étapes suivantes ------------------- */}
        <section className="mt-10 rounded-[var(--radius-card)] bg-sand-50 p-6 sm:p-8">
          <h2 className="text-[17px] font-semibold text-navy-950">
            {t.confirmation.whatNext}
          </h2>
          <ol className="mt-5 space-y-4">
            {[t.confirmation.steps.one, t.confirmation.steps.two, t.confirmation.steps.three].map(
              (step, index) => (
                <li key={index} className="flex gap-3.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-bold text-teal-700 shadow-sm">
                    {index + 1}
                  </span>
                  <p className="text-[14px] leading-relaxed text-navy-600">{step}</p>
                </li>
              ),
            )}
          </ol>
        </section>

        {/* ------------------- Contact ------------------- */}
        <section className="mt-8 text-center">
          <p className="text-[14px] text-navy-500">{t.confirmation.needHelp}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <Button asChild variant="outline">
              <a href={`tel:${agency.mobileHref}`}>
                <Phone className="size-4" />
                <span className="ltr-content">{agency.mobile}</span>
              </a>
            </Button>
            <Button asChild variant="whatsapp">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-4" />
                {t.common.whatsapp}
              </a>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/${locale}`}>{t.confirmation.backHome}</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <dt className="flex items-center gap-2.5 text-[13.5px] text-navy-500">
        <Icon className="size-4 shrink-0 text-navy-300" />
        {label}
      </dt>
      <dd className="ltr-content text-end text-[13.5px] font-medium text-navy-900">
        {value}
      </dd>
    </div>
  );
}
