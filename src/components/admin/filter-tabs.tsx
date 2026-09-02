"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Filtres en onglets pilotés par l'URL (statut de réservation, état de la
 * flotte…). Un filtre appliqué reste partageable et survit au rechargement.
 */
export function FilterTabs({
  param,
  options,
}: {
  param: string;
  options: { value: string; label: string; count?: number }[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(param) ?? "";

  function hrefFor(value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(param, value);
    else next.delete(param);
    next.delete("page");
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div className="flex w-full gap-1 overflow-x-auto rounded-xl bg-navy-100/60 p-1">
      {options.map((option) => {
        const isActive = current === option.value;
        return (
          <Link
            key={option.value || "all"}
            href={hrefFor(option.value)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all",
              isActive
                ? "bg-white text-navy-900 shadow-[0_1px_2px_rgba(6,27,39,.08)]"
                : "text-navy-500 hover:text-navy-800",
            )}
          >
            {option.label}
            {option.count != null ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums",
                  isActive ? "bg-teal-50 text-teal-700" : "bg-white/70 text-navy-400",
                )}
              >
                {option.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
