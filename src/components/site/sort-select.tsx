"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/input";
import type { Dictionary } from "@/i18n";

export function SortSelect({ t }: { t: Dictionary }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-2.5 text-[13px] text-navy-500">
      <span className="whitespace-nowrap">{t.vehicles.sort.label}</span>
      <NativeSelect
        className="h-9 w-auto min-w-[10.5rem] text-[13px]"
        value={params.get("sort") ?? ""}
        onChange={(event) => {
          const next = new URLSearchParams(params.toString());
          if (event.target.value) next.set("sort", event.target.value);
          else next.delete("sort");
          router.push(`${pathname}?${next.toString()}`, { scroll: false });
        }}
        aria-label={t.vehicles.sort.label}
      >
        <option value="">{t.vehicles.sort.recommended}</option>
        <option value="price-asc">{t.vehicles.sort.priceAsc}</option>
        <option value="price-desc">{t.vehicles.sort.priceDesc}</option>
        <option value="recent">{t.vehicles.sort.recent}</option>
      </NativeSelect>
    </label>
  );
}
