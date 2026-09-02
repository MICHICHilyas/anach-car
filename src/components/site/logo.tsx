import Image from "next/image";
import Link from "next/link";
import { AGENCY } from "@/config/agency";
import { cn } from "@/lib/utils";

/**
 * Identité de marque.
 *
 * Deux rendus : le logo officiel de l'agence (déclinaisons générées par
 * `npm run brand`), ou une version typographique de secours si aucun fichier
 * n'est disponible. Aucun logo n'est inventé.
 *
 * `variant` choisit la déclinaison : `dark` pour les fonds clairs,
 * `light` pour les fonds sombres (pied de page, barre latérale, hero).
 */
const SIZES = {
  sm: "h-9",
  md: "h-11",
  lg: "h-16",
} as const;

export function Logo({
  variant = "dark",
  size = "md",
  compact = false,
  href = "/",
  className,
  priority = true,
}: {
  variant?: "dark" | "light";
  size?: keyof typeof SIZES;
  /** Sans la baseline : à privilégier dans les en-têtes. */
  compact?: boolean;
  href?: string | null;
  className?: string;
  priority?: boolean;
}) {
  const isLight = variant === "light";
  const { logo } = AGENCY;

  const source = compact
    ? {
        src: isLight ? logo.srcCompactWhite : logo.srcCompact,
        width: logo.compactWidth,
        height: logo.compactHeight,
      }
    : {
        src: isLight ? logo.srcWhite : logo.src,
        width: logo.width,
        height: logo.height,
      };

  const content = logo.useImage ? (
    <Image
      src={source.src}
      alt={`${AGENCY.name} — ${AGENCY.tagline}`}
      width={source.width}
      height={source.height}
      priority={priority}
      className={cn("w-auto", SIZES[size])}
    />
  ) : (
    <span className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-[10px] text-[13px] font-bold tracking-tight",
          isLight ? "bg-teal-500 text-navy-950" : "bg-navy-900 text-teal-300",
        )}
        aria-hidden
      >
        AC
      </span>
      <span className="leading-none">
        <span
          className={cn(
            "block font-[family-name:var(--font-display)] text-[17px] font-bold tracking-[-0.03em]",
            isLight ? "text-white" : "text-navy-950",
          )}
        >
          Anach<span className="text-teal-500"> Car</span>
        </span>
        <span
          className={cn(
            "mt-0.5 block text-[9.5px] font-medium uppercase tracking-[0.16em]",
            isLight ? "text-navy-300" : "text-navy-400",
          )}
        >
          Location de voitures
        </span>
      </span>
    </span>
  );

  if (!href) return <span className={className}>{content}</span>;

  return (
    <Link
      href={href}
      className={cn("inline-flex items-center", className)}
      aria-label={`${AGENCY.name} — accueil`}
    >
      {content}
    </Link>
  );
}
