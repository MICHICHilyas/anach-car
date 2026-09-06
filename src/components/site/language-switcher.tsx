"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Globe, Check } from "lucide-react";
import { LOCALES, LOCALE_META, isLocale, type Locale } from "@/i18n/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { rememberLocale } from "@/server/actions/locale";

/**
 * Sélecteur de langue : remplace le premier segment de l'URL et mémorise le
 * choix dans un cookie pour les visites suivantes.
 *
 * L'ouverture du menu est pilotée par cet état plutôt que laissée à Radix.
 * Le menu est modal : tant qu'il est ouvert, une couche invisible recouvre la
 * page et neutralise les clics. Or la navigation démonte puis remonte le
 * composant, et Radix n'a pas toujours le temps de retirer cette couche — le
 * bandeau paraît alors avoir disparu, et il faut cliquer n'importe où pour
 * qu'il revienne. On ferme donc explicitement avant de naviguer.
 */
export function LanguageSwitcher({
  current,
  variant = "dark",
}: {
  current: Locale;
  variant?: "dark" | "light";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function switchTo(locale: Locale) {
    setOpen(false);

    // On reconstruit le chemin sans muter le tableau d'origine.
    const segments = pathname.split("/").filter(Boolean);
    const rest = segments.length && isLocale(segments[0]) ? segments.slice(1) : segments;

    startTransition(async () => {
      await rememberLocale(locale);
      router.push(`/${[locale, ...rest].join("/")}`);
      router.refresh();
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors",
          variant === "light"
            ? "text-navy-200 hover:bg-white/10 hover:text-white"
            : "text-navy-600 hover:bg-navy-50 hover:text-navy-900",
        )}
        aria-label="Changer de langue"
      >
        <Globe className="size-4" />
        <span className="uppercase">{current}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onSelect={() => switchTo(locale)}
            className="justify-between"
          >
            <span
              className={cn(locale === "ar" && "font-[family-name:var(--font-arabic)]")}
            >
              {LOCALE_META[locale].nativeLabel}
            </span>
            {locale === current ? (
              <Check className="size-3.5 text-teal-600" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
