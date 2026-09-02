import { Check } from "lucide-react";
import type { Dictionary } from "@/i18n";
import { Reveal } from "@/components/ui/reveal";

/**
 * Bandeau de réassurance, placé juste sous le moteur de recherche.
 *
 * Volontairement dépouillé : une ligne de coches, pas de cartes ni d'icônes
 * colorées. Il rassure au moment précis où le visiteur hésite à réserver,
 * sans détourner l'attention du formulaire.
 */
export function TrustStrip({ t }: { t: Dictionary }) {
  const points = [
    t.trust.fleet,
    t.trust.transparent,
    t.trust.support,
    t.trust.fast,
    t.trust.local,
  ];

  return (
    <Reveal className="container-page mt-8">
      <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
        {points.map((point) => (
          <li
            key={point}
            className="flex items-center gap-2 text-[13px] font-medium text-navy-500"
          >
            <Check className="size-3.5 shrink-0 text-teal-600" strokeWidth={3} />
            {point}
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
