import Link from "next/link";
import { Phone } from "lucide-react";
import { getAgencyContact } from "@/lib/settings";
import { getDictionary, type Locale } from "@/i18n";
import { whatsappGeneral } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { MobileMenu } from "@/components/site/mobile-menu";
import { NavLink } from "@/components/site/nav-link";
import { StickyHeader } from "@/components/site/sticky-header";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const [agency, whatsappHref] = await Promise.all([
    getAgencyContact(),
    whatsappGeneral(),
  ]);
  const t = getDictionary(locale);
  const base = `/${locale}`;

  const links = [
    { href: base, label: t.nav.home },
    { href: `${base}/vehicules`, label: t.nav.vehicles },
    { href: `${base}/a-propos`, label: t.nav.about },
    { href: `${base}/contact`, label: t.nav.contact },
  ];

  return (
    <StickyHeader>
      <div className="container-page flex h-[72px] items-center justify-between gap-6">
        <Logo href={base} compact />

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label={t.nav.menu}
        >
          {links.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <LanguageSwitcher current={locale} />

          <a
            href={`tel:${agency.mobileHref}`}
            className="hidden items-center gap-2 rounded-lg px-3 py-2 text-[13.5px] font-semibold text-navy-800 transition-colors hover:bg-navy-50 xl:inline-flex"
          >
            <Phone className="size-4 text-teal-600" />
            <span className="ltr-content">{agency.mobile}</span>
          </a>

          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href={`${base}/vehicules`}>{t.nav.book}</Link>
          </Button>

          <MobileMenu
            links={links}
            bookLabel={t.nav.book}
            callLabel={t.common.callUs}
            whatsappHref={whatsappHref}
            whatsappLabel={t.common.whatsapp}
          />
        </div>
      </div>
    </StickyHeader>
  );
}
