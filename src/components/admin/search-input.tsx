"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Recherche serveur pilotée par l'URL (?q=…), soumise à la validation. */
export function SearchInput({
  placeholder = "Rechercher…",
  param = "q",
}: {
  placeholder?: string;
  param?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(param) ?? "");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(searchParams.toString());
    if (value.trim()) next.set(param, value.trim());
    else next.delete(param);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <form onSubmit={submit} className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-navy-300" />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="h-10 ps-9 pe-9"
        aria-label={placeholder}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            setValue("");
            const next = new URLSearchParams(searchParams.toString());
            next.delete(param);
            router.push(`${pathname}?${next.toString()}`);
          }}
          className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-navy-300 hover:text-navy-600"
          aria-label="Effacer la recherche"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </form>
  );
}
