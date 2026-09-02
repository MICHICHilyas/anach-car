"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Lien de navigation qui met en évidence la page courante. */
export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive =
    href.split("/").length === 2 ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative rounded-lg px-3.5 py-2 text-[14px] font-medium transition-colors",
        isActive
          ? "text-navy-950"
          : "text-navy-500 hover:text-navy-900",
      )}
    >
      {children}
      {isActive ? (
        <span className="absolute inset-x-3.5 -bottom-[22px] h-0.5 rounded-full bg-teal-500" />
      ) : null}
    </Link>
  );
}
