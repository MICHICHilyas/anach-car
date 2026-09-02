import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * État vide réutilisable : aucune liste du site ou du dashboard ne doit
 * afficher une zone blanche sans explication ni action de sortie.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-navy-200 bg-navy-50/40 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-white text-navy-400 shadow-[var(--shadow-soft)]">
          <Icon className="size-5" />
        </span>
      ) : null}
      <p className="text-[15px] font-semibold text-navy-900">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-navy-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex gap-2">{action}</div> : null}
    </div>
  );
}
