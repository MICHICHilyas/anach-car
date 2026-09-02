"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * En-tête collant.
 *
 * En haut de page, l'en-tête se fond dans le hero : fond très transparent,
 * pas de bordure. Dès que la page défile, il se densifie légèrement pour
 * rester lisible au-dessus du contenu clair.
 *
 * L'écouteur est passif (il ne bloque jamais le défilement) et l'état n'est
 * mis à jour qu'au franchissement du seuil, pas à chaque pixel.
 */
export function StickyHeader({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const sync = () => setScrolled(window.scrollY > 8);

    // Différé d'une frame : évite un rendu synchrone au montage, et couvre
    // le cas d'un rechargement en plein milieu de la page.
    const frame = requestAnimationFrame(sync);
    window.addEventListener("scroll", sync, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", sync);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ease-out",
        scrolled
          ? "border-b border-navy-100/80 bg-white/90 shadow-[0_1px_12px_-6px_rgba(6,27,39,.18)] backdrop-blur-md"
          : "border-b border-transparent bg-white/80 backdrop-blur-md",
      )}
    >
      {children}
    </header>
  );
}
