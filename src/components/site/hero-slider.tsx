"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { HERO_SLIDE_DURATION } from "@/config/hero";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  dailyRate: number;
  /** Libellés déjà traduits côté serveur : le client ne fait pas de mapping. */
  transmission: string;
  fuel: string;
  seats: number;
  hasAirConditioning: boolean;
  image: string;
  /** Libellé de la catégorie, affiché tant que la photo n'est pas authentique. */
  categoryLabel: string;
  /**
   * La photo est-elle celle de ce véhicule précis ?
   *
   * Tant qu'elle ne l'est pas, on n'annonce pas la marque et le modèle : une
   * agence ne peut pas montrer une voiture qu'elle ne loue pas. On présente
   * alors la catégorie, ce qui reste exact. Dès qu'une photo est téléversée
   * depuis /admin/vehicules/[id], le nom du modèle réapparaît de lui-même.
   */
  isRealPhoto: boolean;
};

/**
 * Hero du site : la voiture est le sujet principal.
 *
 * Chaque véhicule reste affiché quelques secondes, puis cède la place au
 * suivant par un fondu enchaîné pendant qu'un lent zoom (Ken Burns) donne
 * de la vie à l'image. Les photos sont empilées et jouent sur `opacity` et
 * `transform` uniquement : deux propriétés composées par le GPU, donc pas de
 * recalcul de mise en page à chaque image.
 *
 * Le défilement automatique s'interrompt au survol, au focus clavier, quand
 * l'onglet passe en arrière-plan, et lorsque l'utilisateur a demandé à
 * réduire les animations.
 */
export function HeroSlider({
  slides,
  locale,
  t,
}: {
  slides: HeroSlide[];
  locale: Locale;
  t: Dictionary;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const total = slides.length;
  const current = slides[index];

  const goTo = useCallback(
    (next: number) => setIndex(((next % total) + total) % total),
    [total],
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const previous = useCallback(() => goTo(index - 1), [goTo, index]);

  // Préférence système : on la lit une fois et on suit ses changements.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Onglet en arrière-plan : inutile d'animer.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Défilement automatique.
  useEffect(() => {
    if (paused || reducedMotion || total < 2) return;
    const timer = window.setTimeout(next, HERO_SLIDE_DURATION);
    return () => window.clearTimeout(timer);
  }, [index, paused, reducedMotion, total, next]);

  if (!current) return null;

  const animate = !reducedMotion;

  return (
    <section
      className="surface-deep relative overflow-hidden"
      aria-roledescription="carrousel"
      aria-label={t.hero.slider.label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* --------------------------------------------------------------------
          Photo du véhicule.
          Enfant direct de la section — et non du conteneur centré — pour
          filer jusqu'au bord de l'écran sans couture visible.
          Sur mobile : bandeau en haut. À partir de `lg` : pleine hauteur sur
          la moitié droite.
      -------------------------------------------------------------------- */}
      <div
          className={cn(
            "hero-media-mask relative aspect-[16/10] w-full overflow-hidden",
            "lg:absolute lg:inset-y-0 lg:end-0 lg:aspect-auto lg:w-[64%]",
          )}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0].clientX;
          }}
          onTouchEnd={(event) => {
            const start = touchStartX.current;
            if (start === null) return;
            const delta = event.changedTouches[0].clientX - start;
            if (Math.abs(delta) > 50) {
              // En arabe, la lecture va de droite à gauche : le geste suit.
              const forward = locale === "ar" ? delta > 0 : delta < 0;
              if (forward) next();
              else previous();
            }
            touchStartX.current = null;
          }}
        >
          {slides.map((slide, slideIndex) => {
            const isActive = slideIndex === index;
            return (
              <div
                key={slide.id}
                className={cn(
                  "absolute inset-0 transition-opacity duration-[1200ms] ease-out",
                  isActive ? "opacity-100" : "opacity-0",
                )}
                aria-hidden={!isActive}
              >
                <Image
                  src={slide.image}
                  alt={
                    slide.isRealPhoto
                      ? `${slide.brand} ${slide.model}`
                      : slide.categoryLabel
                  }
                  fill
                  // La première image est le plus gros élément visible au
                  // chargement : elle est chargée en priorité, les autres à la
                  // demande.
                  priority={slideIndex === 0}
                  loading={slideIndex === 0 ? undefined : "lazy"}
                  sizes="(max-width: 1024px) 100vw, 62vw"
                  className={cn(
                    "object-cover object-center will-change-transform",
                    isActive && animate && "animate-[hero-zoom_9s_ease-out_forwards]",
                  )}
                />
              </div>
            );
          })}

          {/*
            Voile sombre léger : la fiche véhicule et les contrôles se posent
            sur la carrosserie, ils ont besoin d'un fond un peu plus dense.
            Le fondu des bords, lui, est assuré par .hero-media-mask.
          */}
          <div
            className="pointer-events-none absolute inset-0 bg-navy-950/25 lg:bg-gradient-to-t lg:from-navy-950/55 lg:via-transparent lg:to-transparent"
            aria-hidden
          />
      </div>

      <div className="container-page relative grid gap-8 pb-32 pt-10 sm:pt-14 lg:min-h-[720px] lg:grid-cols-2 lg:items-center lg:gap-16 lg:pb-40 lg:pt-16">
        {/* ------------------------------ Texte ------------------------------ */}
        <div className="relative z-10 max-w-xl">
          {/*
            Entrée en cascade au chargement : chaque bloc arrive légèrement
            après le précédent. `both` fige l'état initial avant le départ,
            ce qui évite le clignotement du contenu déjà peint.
          */}
          <p className="hero-enter inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-teal-300">
            {t.hero.eyebrow}
          </p>

          <h1 className="hero-enter hero-enter-1 mt-6 text-balance font-[family-name:var(--font-display)] text-[2.6rem] font-bold leading-[1.02] tracking-[-0.038em] text-white [text-shadow:0_2px_24px_rgba(4,21,31,.45)] sm:text-[3.4rem] lg:text-[4rem]">
            {t.hero.title}
          </h1>

          <p className="hero-enter hero-enter-2 mt-5 max-w-md text-[17px] leading-relaxed text-navy-300">
            {t.hero.subtitle}
          </p>

          <ul className="hero-enter hero-enter-3 mt-8 space-y-2.5">
            {[t.hero.trust.fleet, t.hero.trust.transparent, t.hero.trust.support].map(
              (label) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 text-[13.5px] font-medium text-navy-200"
                >
                  <span
                    className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-300"
                    aria-hidden
                  >
                    <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {label}
                </li>
              ),
            )}
          </ul>

          <div className="hero-enter hero-enter-4 mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={`/${locale}/vehicules`}>
                {t.hero.cta.browse}
                <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:border-teal-400 hover:bg-white/10"
            >
              <Link href={`/${locale}/vehicules/${current.slug}`}>
                {t.hero.cta.bookThis}
              </Link>
            </Button>
          </div>
        </div>

        {/* ------------------- Véhicule affiché + contrôles ------------------- */}
        <div className="relative z-10 lg:self-end lg:justify-self-end lg:pb-2">
          <div
            // La clé force le rejeu de l'animation d'entrée à chaque véhicule.
            key={current.id}
            className={cn(
              // Verre dépoli conservé sur toutes les tailles : la fiche est
              // posée sur la carrosserie, elle a besoin de son propre fond
              // pour rester lisible.
              "inline-block rounded-2xl border border-white/10 bg-navy-950/55 px-6 py-5 backdrop-blur-md",
              animate && "animate-[hero-rise_0.7s_ease-out_both]",
            )}
          >
            <p
              className="font-[family-name:var(--font-display)] text-[22px] font-bold tracking-tight text-white"
              aria-live="polite"
            >
              {current.isRealPhoto
                ? `${current.brand} ${current.model}`
                : current.categoryLabel}
            </p>

            <p className="mt-1.5 text-[13px] text-navy-300">
              {t.vehicles.from}{" "}
              <span className="ltr-inline text-[17px] font-semibold text-teal-300">
                {formatMoney(current.dailyRate)}
              </span>{" "}
              {t.common.perDay}
            </p>

            <p className="mt-2.5 text-[12.5px] text-navy-400">
              {[
                current.transmission,
                `${current.seats} ${t.vehicles.seats}`,
                current.fuel,
                current.hasAirConditioning ? t.vehicles.airConditioning : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          {/* Compteur, barre de progression et flèches */}
          <div className="mt-6 flex items-center gap-4 lg:justify-end">
            <span className="ltr-content font-[family-name:var(--font-display)] text-[12.5px] font-semibold tabular-nums text-navy-300">
              <span className="text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="mx-1 text-navy-500">/</span>
              {String(total).padStart(2, "0")}
            </span>

            <div
              className="h-px w-24 overflow-hidden bg-white/15 sm:w-32"
              role="presentation"
            >
              <div
                key={`${index}-${paused}`}
                className={cn(
                  "h-full origin-left bg-teal-400 rtl:origin-right",
                  animate && !paused
                    ? "animate-[hero-progress_var(--hero-duration)_linear_forwards]"
                    : "scale-x-0",
                )}
                style={
                  {
                    "--hero-duration": `${HERO_SLIDE_DURATION}ms`,
                  } as React.CSSProperties
                }
              />
            </div>

            <div className="flex gap-1.5">
              <ControlButton onClick={previous} label={t.hero.slider.previous}>
                <ChevronLeft className="size-4 rtl:rotate-180" />
              </ControlButton>
              <ControlButton onClick={next} label={t.hero.slider.next}>
                <ChevronRight className="size-4 rtl:rotate-180" />
              </ControlButton>
            </div>
          </div>
        </div>
      </div>

      {/* Filet lumineux, rappel du turquoise de la marque */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent"
        aria-hidden
      />
    </section>
  );
}

function ControlButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 text-navy-200 transition-colors hover:border-teal-400/60 hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
    >
      {children}
    </button>
  );
}
