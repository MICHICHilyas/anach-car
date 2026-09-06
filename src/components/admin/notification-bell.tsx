"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

/**
 * Cloche des notifications, rafraîchie toute les 30 secondes.
 *
 * Le compteur n'était recalculé qu'au chargement d'une page : le gérant
 * pouvait laisser son écran ouvert pendant qu'une demande arrivait sans rien
 * voir. Il affiche désormais le NOMBRE de notifications non lues, et non un
 * simple point — savoir qu'il y a trois demandes en attente plutôt qu'une
 * change la façon d'organiser sa journée.
 *
 * L'interrogation s'arrête quand l'onglet passe en arrière-plan : inutile de
 * solliciter le serveur pour un écran que personne ne regarde.
 */
const REFRESH_MS = 30_000;

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let previous = initialUnread;

    async function sync() {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/admin/notifications/count", {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { unread: number };
        setUnread(data.unread);

        /*
         * Une nouvelle demande vient d'arriver : on rafraîchit la page pour
         * que la liste des réservations et les compteurs du menu latéral
         * suivent, sans que le gérant ait à recharger lui-même.
         */
        if (data.unread > previous) router.refresh();
        previous = data.unread;
      } catch {
        // Réseau coupé ou serveur momentanément indisponible : on garde le
        // dernier compteur connu et on retentera au prochain passage.
      }
    }

    const timer = setInterval(sync, REFRESH_MS);
    // Reprise immédiate quand l'agence revient sur l'onglet.
    document.addEventListener("visibilitychange", sync);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [initialUnread, router]);

  return (
    <Link
      href="/admin/notifications"
      className="relative inline-flex size-10 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-900"
      aria-label={`Notifications${unread > 0 ? ` (${unread} non lues)` : ""}`}
    >
      <Bell className="size-5" />
      {unread > 0 ? (
        <span
          className="absolute -end-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10.5px] font-bold leading-[18px] text-white ring-2 ring-white"
          aria-hidden
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
