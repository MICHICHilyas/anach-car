import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * Enveloppe standard d'un champ de formulaire : libellé, aide, message
 * d'erreur et liaison ARIA. Utilisée partout pour que tous les formulaires
 * du site et du dashboard se comportent de la même façon.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor}>
          {label}
          {required ? (
            <span className="text-[var(--color-danger)]" aria-hidden>
              *
            </span>
          ) : null}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="text-[12.5px] font-medium text-[var(--color-danger)]"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-navy-400">{hint}</p>
      ) : null}
    </div>
  );
}
