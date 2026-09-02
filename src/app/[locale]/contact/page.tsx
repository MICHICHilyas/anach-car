import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, Mail, MapPin, MessageCircle, Phone, Smartphone } from "lucide-react";
import { getDictionary, type Locale } from "@/i18n";
import { isLocale } from "@/i18n/config";
import { AGENCY, googleMapsEmbedUrl, googleMapsLink } from "@/config/agency";
import { whatsappGeneral } from "@/lib/whatsapp";
import { ContactForm } from "@/components/site/contact-form";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "fr");
  return {
    title: t.contact.title,
    description: t.contact.subtitle,
    alternates: { canonical: `/${locale}/contact` },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);

  const coordinates = [
    {
      icon: MapPin,
      label: t.common.address,
      value: AGENCY.address.full,
      href: googleMapsLink(),
      external: true,
      ltr: false,
    },
    {
      icon: Phone,
      label: t.common.phone,
      value: AGENCY.phone.landline,
      href: `tel:${AGENCY.phone.landlineHref}`,
      ltr: true,
    },
    {
      icon: Smartphone,
      label: t.common.mobile,
      value: AGENCY.phone.mobile,
      href: `tel:${AGENCY.phone.mobileHref}`,
      ltr: true,
    },
    {
      icon: Mail,
      label: t.common.email,
      value: AGENCY.email,
      href: `mailto:${AGENCY.email}`,
      ltr: true,
    },
  ];

  return (
    <>
      <section className="border-b border-navy-100 bg-navy-50/40">
        <div className="container-page py-12 lg:py-16">
          <h1 className="text-[2rem] font-semibold tracking-tight text-navy-950 sm:text-[2.5rem]">
            {t.contact.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-navy-500">
            {t.contact.subtitle}
          </p>
        </div>
      </section>

      <div className="container-page grid gap-12 py-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16 lg:py-16">
        {/* ------------------ Coordonnées ------------------ */}
        <div>
          <ul className="space-y-5">
            {coordinates.map((item) => (
              <li key={item.label} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <item.icon className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-navy-400">
                    {item.label}
                  </p>
                  <a
                    href={item.href}
                    {...(item.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className={cn(
                      "mt-1 block break-words text-[14.5px] font-medium leading-relaxed text-navy-900 transition-colors hover:text-teal-700",
                      // Numéros et email : toujours lus de gauche à droite.
                      item.ltr && "ltr-content",
                    )}
                  >
                    {item.value}
                  </a>
                </div>
              </li>
            ))}

            <li className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Clock className="size-4.5" />
              </span>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-navy-400">
                  {t.common.openingHours}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {AGENCY.openingHours.map((slot) => (
                    <li key={slot.days} className="text-[14.5px] text-navy-700">
                      <span className="font-medium text-navy-900">{slot.days}</span>{" "}
                      · <span className="ltr-inline">{slot.hours}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          </ul>

          <Button asChild variant="whatsapp" size="lg" className="mt-8 w-full sm:w-auto">
            <a href={whatsappGeneral()} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" />
              {t.contact.whatsappCta}
            </a>
          </Button>

          <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-navy-100">
            <h2 className="sr-only">{t.contact.findUs}</h2>
            <iframe
              src={googleMapsEmbedUrl()}
              title={`${AGENCY.name} — ${t.contact.findUs}`}
              className="h-[300px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>

        {/* ------------------ Formulaire ------------------ */}
        <div className="rounded-[var(--radius-card)] border border-navy-100 bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <h2 className="text-[19px] font-semibold text-navy-950">
            {t.contact.formTitle}
          </h2>
          <div className="mt-6">
            <ContactForm t={t} />
          </div>
        </div>
      </div>
    </>
  );
}
