import Link from "next/link";
import { Mail, MapPin, Phone, Smartphone } from "lucide-react";
import { googleMapsLink } from "@/config/agency";
import { getAgencyContact } from "@/lib/settings";
import { getDictionary, type Locale } from "@/i18n";
import { Logo } from "@/components/site/logo";

export async function SiteFooter({ locale }: { locale: Locale }) {
  // Coordonnées telles que saisies dans /admin/parametres : le gérant doit
  // pouvoir changer de numéro sans qu'un développeur intervienne.
  const agency = await getAgencyContact();
  const t = getDictionary(locale);
  const base = `/${locale}`;
  const year = new Date().getFullYear();

  const navigation = [
    { href: base, label: t.nav.home },
    { href: `${base}/vehicules`, label: t.nav.vehicles },
    { href: `${base}/a-propos`, label: t.nav.about },
    { href: `${base}/contact`, label: t.nav.contact },
  ];

  const legal = [
    { href: `${base}/mentions-legales`, label: t.footer.legalNotice },
    { href: `${base}/confidentialite`, label: t.footer.privacy },
    { href: `${base}/conditions-generales`, label: t.footer.terms },
    { href: `${base}/annulation`, label: t.footer.cancellation },
  ];

  return (
    <footer className="mt-24 bg-navy-950 text-navy-300">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:pe-8">
          <Logo variant="light" href={base} />
          <p className="mt-5 text-[13.5px] leading-relaxed text-navy-400">
            {t.footer.about}
          </p>
        </div>

        <nav aria-labelledby="footer-nav">
          <h2
            id="footer-nav"
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-400"
          >
            {t.footer.navigation}
          </h2>
          <ul className="mt-5 space-y-3">
            {navigation.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[13.5px] text-navy-300 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-legal">
          <h2
            id="footer-legal"
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-400"
          >
            {t.footer.legal}
          </h2>
          <ul className="mt-5 space-y-3">
            {legal.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[13.5px] text-navy-300 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <address className="not-italic">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-400">
            {t.footer.contact}
          </h2>
          <ul className="mt-5 space-y-3.5 text-[13.5px]">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-navy-500" />
              <a
                href={googleMapsLink(agency.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="leading-relaxed transition-colors hover:text-white"
              >
                {agency.address}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="size-4 shrink-0 text-navy-500" />
              <a
                href={`tel:${agency.phoneHref}`}
                className="ltr-content transition-colors hover:text-white"
              >
                {agency.phone}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Smartphone className="size-4 shrink-0 text-navy-500" />
              <a
                href={`tel:${agency.mobileHref}`}
                className="ltr-content transition-colors hover:text-white"
              >
                {agency.mobile}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="size-4 shrink-0 text-navy-500" />
              <a
                href={`mailto:${agency.email}`}
                className="ltr-content break-all transition-colors hover:text-white"
              >
                {agency.email}
              </a>
            </li>
          </ul>
        </address>
      </div>

      <div className="border-t border-white/8">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 pb-24 pe-5 text-[12.5px] text-navy-500 sm:flex-row sm:pb-6 sm:pe-32">
          <p>
            © {year} {agency.name}. {t.footer.rights}
          </p>
          <div className="flex items-center gap-5">
            <span>
              {t.common.openingHours} : {agency.openingHours}
            </span>
            <Link
              href="/admin"
              className="transition-colors hover:text-navy-300"
            >
              {t.footer.adminAccess}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
