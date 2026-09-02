import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/labels";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none whitespace-nowrap",
  {
    variants: {
      tone: {
        success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
        warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
        danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
        info: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
        neutral: "bg-navy-100 text-navy-600",
        teal: "bg-teal-50 text-teal-700",
        outline: "border border-navy-200 bg-white text-navy-600",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Point coloré en tête de badge — utile dans les tableaux denses. */
  dot?: boolean;
}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot ? (
        <span className="size-1.5 rounded-full bg-current opacity-70" />
      ) : null}
      {children}
    </span>
  );
}

/** Raccourci : les libellés de src/lib/labels.ts portent déjà leur `tone`. */
export function StatusBadge({
  status,
  className,
  dot = true,
}: {
  status: { label: string; tone: Tone };
  className?: string;
  dot?: boolean;
}) {
  return (
    <Badge tone={status.tone} dot={dot} className={className}>
      {status.label}
    </Badge>
  );
}
