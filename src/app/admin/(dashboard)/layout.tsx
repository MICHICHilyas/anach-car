import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminMenuButton, AdminSidebar } from "@/components/admin/sidebar";
import { AdminNavProvider } from "@/components/admin/nav-context";
import { UserMenu } from "@/components/admin/user-menu";
import { NotificationBell } from "@/components/admin/notification-bell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: { default: "Espace agence", template: "%s · Anach Car" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Contrôle d'accès réel : le middleware ne vérifie que la présence d'un
  // cookie, c'est ici que la session est validée en base à chaque requête.
  const user = await requireUser();

  const [pending, unread] = await Promise.all([
    db.reservation.count({ where: { status: "PENDING" } }),
    db.notification.count({ where: { isRead: false } }),
  ]);

  return (
    <AdminNavProvider>
      <div className="min-h-dvh bg-navy-50/50">
        {/* Hors de l'en-tête : un parent avec backdrop-blur deviendrait le
            bloc conteneur de cette barre `fixed` et l'écraserait. */}
        <AdminSidebar counts={{ pending, unread }} />

        <div className="lg:ps-[260px]">
          <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between gap-4 border-b border-navy-100 bg-white/90 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-2">
              <AdminMenuButton />
              <span className="text-[13px] font-medium text-navy-400 lg:hidden">
                Anach Car
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/admin/reservations/nouvelle">
                  <Plus className="size-4" />
                  Nouvelle réservation
                </Link>
              </Button>

              <NotificationBell initialUnread={unread} />

              <UserMenu user={user} />
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </AdminNavProvider>
  );
}
