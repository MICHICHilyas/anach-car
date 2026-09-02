import { BadgeCheck, Star } from "lucide-react";
import { TESTIMONIALS, averageRating, type Testimonial } from "@/config/testimonials";
import { interpolate, type Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

/**
 * Avis clients.
 *
 * Composant serveur : les avis sont statiques, aucun état ni script n'est
 * nécessaire. Sur mobile, le défilement horizontal utilise `scroll-snap`
 * natif plutôt qu'un carrousel en JavaScript — geste plus fluide, aucun
 * poids ajouté, et navigation au clavier conservée.
 *
 * La section disparaît d'elle-même si aucun avis n'est renseigné.
 */
export function Testimonials({ locale, t }: { locale: Locale; t: Dictionary }) {
  if (TESTIMONIALS.length === 0) return null;

  const average = averageRating();

  return (
    <section className="container-page mt-24 lg:mt-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-teal-700">
          {t.testimonials.eyebrow}
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-navy-950 sm:text-[2.15rem]">
          {t.testimonials.title}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-navy-500">
          {t.testimonials.subtitle}
        </p>

        <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-navy-100 bg-white px-4 py-2 shadow-[var(--shadow-soft)]">
          <Stars rating={Math.round(average)} />
          <span className="ltr-inline text-[14px] font-semibold text-navy-950">
            {average.toLocaleString(locale === "en" ? "en-GB" : "fr-MA", {
              minimumFractionDigits: 1,
            })}
          </span>
          <span className="text-[12.5px] text-navy-400">
            {interpolate(t.testimonials.basedOn, { count: TESTIMONIALS.length })}
          </span>
        </div>
      </Reveal>

      {/*
        Grille à partir de `md`. En dessous : rail à défilement horizontal.
        Les marges négatives font toucher les bords de l'écran, et le padding
        les compense — la carte suivante dépasse alors légèrement, ce qui
        signale qu'on peut faire défiler.
      */}
      <ul
        className={cn(
          "-mx-5 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0",
        )}
      >
        {TESTIMONIALS.map((review, index) => (
          <Reveal
            key={review.id}
            as="li"
            delay={index * 90}
            className="w-[85%] shrink-0 snap-start sm:w-[60%] md:w-auto"
          >
            <TestimonialCard review={review} locale={locale} t={t} />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

function TestimonialCard({
  review,
  locale,
  t,
}: {
  review: Testimonial;
  locale: Locale;
  t: Dictionary;
}) {
  const quote =
    (locale === "en" ? review.quote.en : locale === "ar" ? review.quote.ar : null) ??
    review.quote.fr;

  return (
    <figure className="flex h-full flex-col rounded-[var(--radius-card)] border border-navy-100 bg-white p-6 shadow-[var(--shadow-soft)] transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]">
      <Stars rating={review.rating} />

      <blockquote className="mt-5 flex-1 text-[14.5px] leading-relaxed text-navy-700">
        {quote}
      </blockquote>

      <figcaption className="mt-6 flex items-center justify-between gap-3 border-t border-navy-50 pt-5">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-navy-950">
            {review.author}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-navy-400">
            {review.origin}
            {review.vehicle ? ` · ${review.vehicle}` : ""}
          </p>
          <p className="mt-0.5 text-[12px] text-navy-400">{review.period}</p>
        </div>

        {review.verified ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700">
            <BadgeCheck className="size-3.5" />
            {t.testimonials.verified}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

/** Cinq étoiles, celles obtenues remplies. */
function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="flex gap-0.5 text-[#e0a32a]"
      role="img"
      aria-label={`${rating} / 5`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={cn("size-4", index < rating ? "fill-current" : "text-navy-200")}
          strokeWidth={index < rating ? 0 : 1.5}
          aria-hidden
        />
      ))}
    </span>
  );
}
