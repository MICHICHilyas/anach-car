import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/labels";

const TONE_STYLES: Record<Tone, { icon: string; value: string }> = {
  success: { icon: "bg-[var(--color-success-soft)] text-[var(--color-success)]", value: "text-navy-950" },
  warning: { icon: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]", value: "text-[var(--color-warning)]" },
  danger: { icon: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]", value: "text-[var(--color-danger)]" },
  info: { icon: "bg-[var(--color-info-soft)] text-[var(--color-info)]", value: "text-navy-950" },
  neutral: { icon: "bg-navy-100 text-navy-500", value: "text-navy-950" },
};

/**
 * Indicateur clé du tableau de bord.
 * Un chiffre, un libellé, une couleur d'état — rien de plus : l'employé doit
 * comprendre la situation en un coup d'œil, sans interpréter un graphique.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: Tone;
  href?: string;
}) {
  const styles = TONE_STYLES[tone];

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex size-9 items-center justify-center rounded-lg", styles.icon)}>
          <Icon className="size-4.5" />
        </span>
        {href ? (
          <ArrowUpRight className="size-4 text-navy-300 transition-colors group-hover:text-teal-600" />
        ) : null}
      </div>
      <p
        className={cn(
          "mt-4 font-[family-name:var(--font-display)] text-[1.9rem] font-bold leading-none tracking-tight tabular-nums",
          styles.value,
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-[13px] font-medium text-navy-600">{label}</p>
      {hint ? <p className="mt-0.5 text-[12px] text-navy-400">{hint}</p> : null}
    </>
  );

  const className =
    "group block rounded-[var(--radius-card)] border border-navy-100 bg-white p-5 shadow-[var(--shadow-soft)] transition-all";

  if (href) {
    return (
      <Link href={href} className={cn(className, "hover:border-navy-200 hover:shadow-[var(--shadow-lift)]")}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}
