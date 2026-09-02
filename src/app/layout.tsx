import type { Metadata, Viewport } from "next";
import { Inter, Sora, IBM_Plex_Sans_Arabic } from "next/font/google";
import { headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_META, isLocale } from "@/i18n/config";
import { AGENCY } from "@/config/agency";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-sora",
  display: "swap",
});

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${AGENCY.name} — Location de voitures à Agadir, Inezgane et Dcheira`,
    template: `%s · ${AGENCY.name}`,
  },
  description:
    "Location de voitures à Agadir, Inezgane et Dcheira. Véhicules récents et entretenus, tarifs clairs, réservation en ligne en quelques minutes.",
  applicationName: AGENCY.name,
  authors: [{ name: AGENCY.name }],
  formatDetection: { telephone: true },
  icons: { icon: "/favicon.png", apple: "/favicon.png" },
};

export const viewport: Viewport = {
  themeColor: "#061b27",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // La langue est fixée par le middleware ; elle pilote lang/dir sur <html>,
  // ce qui suffit à basculer toute la mise en page en RTL pour l'arabe.
  const headerList = await headers();
  const rawLocale = headerList.get("x-locale") ?? DEFAULT_LOCALE;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return (
    <html
      lang={locale}
      dir={LOCALE_META[locale].dir}
      className={`${inter.variable} ${sora.variable} ${arabic.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-white antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
