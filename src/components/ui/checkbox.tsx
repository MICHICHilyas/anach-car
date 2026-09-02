import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Case à cocher et interrupteur.
 *
 * Tous deux reposent sur un `<input>` natif — comportement clavier, lecteurs
 * d'écran, envoi du formulaire et remplissage automatique restent ceux du
 * navigateur. La partie visible est en revanche dessinée par un élément frère
 * piloté par `peer-checked:`.
 *
 * Pourquoi pas plus simple : une coche en image `data:` dans une classe
 * Tailwind est coupée au premier espace de son SVG, et un `::before` n'est
 * pas rendu sur un `<input>`, qui est un élément remplacé. Les deux astuces
 * donnaient un contrôle muet, sans marque visible à l'état coché.
 */
export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <span className={cn("relative inline-flex size-[18px] shrink-0", className)}>
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "peer size-full cursor-pointer appearance-none rounded-[5px] border border-navy-300 bg-white transition-colors",
        "checked:border-teal-600 checked:bg-teal-600",
        "hover:border-navy-400 checked:hover:border-teal-700 checked:hover:bg-teal-700",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500",
        "disabled:cursor-not-allowed disabled:border-navy-200 disabled:bg-navy-50",
      )}
      {...props}
    />
    <Check
      className="pointer-events-none absolute inset-0 m-auto size-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
      strokeWidth={3.5}
      aria-hidden
    />
  </span>
));
Checkbox.displayName = "Checkbox";

export const Switch = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <span className={cn("relative inline-flex h-6 w-11 shrink-0", className)}>
    <input
      ref={ref}
      type="checkbox"
      role="switch"
      className={cn(
        "peer size-full cursor-pointer appearance-none rounded-full bg-navy-200 transition-colors",
        "checked:bg-teal-600",
        "hover:bg-navy-300 checked:hover:bg-teal-700",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
      {...props}
    />
    <span
      className="pointer-events-none absolute start-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5 rtl:peer-checked:-translate-x-5"
      aria-hidden
    />
  </span>
));
Switch.displayName = "Switch";
