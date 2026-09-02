"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Révèle son contenu lorsqu'il entre dans le champ de vision.
 *
 * La classe est posée directement sur le nœud plutôt que via un état React :
 * l'effet est purement visuel, il n'a aucune raison de déclencher un rendu.
 *
 * Trois précautions :
 *  - le contenu est rendu dès le départ, seule l'opacité change : rien ne
 *    dépend du script pour être présent dans le HTML (référencement,
 *    lecteurs d'écran) ;
 *  - l'observateur se détache après le premier passage — inutile de le
 *    garder actif pour un effet qui ne joue qu'une fois ;
 *  - `prefers-reduced-motion` neutralise l'animation côté CSS.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  /** Décalage en millisecondes, pour faire apparaître une série en cascade. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Navigateur sans IntersectionObserver : on affiche sans attendre.
    if (typeof IntersectionObserver === "undefined") {
      element.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.disconnect();
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={cn("reveal", className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
