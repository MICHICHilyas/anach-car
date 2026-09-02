"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ADMIN_NAV } from "@/components/admin/nav-items";
import { useAdminNav } from "@/components/admin/nav-context";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/utils";

export type NavCounts = { pending: number; unread: number };

/**
 * Barre latérale de l'espace agence.
 *
 * Rendue au niveau du layout, JAMAIS à l'intérieur de l'en-tête : celui-ci
 * applique un `backdrop-blur` qui emprisonnerait ce panneau `fixed`.
 * Le bouton d'ouverture, lui, vit dans l'en-tête (voir <AdminMenuButton />).
 */
export function AdminSidebar({ counts }: { counts: NavCounts }) {
  const pathname = usePathname();
  const { open, setOpen } = useAdminNav();

  const links = ADMIN_NAV.map((item) => {
    const isActive =
      "exact" in item && item.exact
        ? pathname === item.href
        : pathname.startsWith(item.href);
    const badge =
      "badge" in item
        ? item.badge === "pending"
          ? counts.pending
          : counts.unread
        : 0;
    return { ...item, isActive, badge };
  });

  const nav = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {links.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          // Le panneau mobile se referme au clic, plutôt que par un effet
          // déclenché sur le changement d'URL.
          onClick={() => setOpen(false)}
          aria-current={item.isActive ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors",
            item.isActive
              ? "bg-teal-500/12 text-teal-300"
              : "text-navy-300 hover:bg-white/5 hover:text-white",
          )}
        >
          <item.icon
            className={cn(
              "size-4 shrink-0",
              item.isActive ? "text-teal-400" : "text-navy-400",
            )}
          />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge > 0 ? (
            <span className="rounded-full bg-teal-500 px-1.5 py-0.5 text-[10.5px] font-bold text-navy-950">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {/* Barre fixe, à partir du grand écran */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-[260px] flex-col bg-navy-950 lg:flex">
        <div className="flex h-[68px] shrink-0 items-center border-b border-white/8 px-5">
          <Logo variant="light" href="/admin" compact />
        </div>
        {nav}
        <div className="shrink-0 border-t border-white/8 px-5 py-4">
          <Link
            href="/fr"
            target="_blank"
            className="text-[12.5px] text-navy-400 transition-colors hover:text-teal-300"
          >
            Voir le site public ↗
          </Link>
        </div>
      </aside>

      {/* Panneau coulissant, sur mobile et tablette */}
      {open ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div
            className="absolute inset-0 bg-navy-950/60"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 start-0 flex w-[80%] max-w-[280px] flex-col bg-navy-950">
            <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-white/8 px-5">
              <Logo variant="light" href="/admin" compact />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-lg text-navy-300 hover:bg-white/10"
                aria-label="Fermer le menu"
              >
                <X className="size-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}
    </>
  );
}

/** Bouton d'ouverture, placé dans l'en-tête. */
export function AdminMenuButton() {
  const { open, setOpen } = useAdminNav();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex size-10 items-center justify-center rounded-lg text-navy-600 transition-colors hover:bg-navy-50 lg:hidden"
      aria-label="Ouvrir le menu"
      aria-expanded={open}
    >
      <Menu className="size-5" />
    </button>
  );
}
