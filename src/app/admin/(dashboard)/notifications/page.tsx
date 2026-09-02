import { Bell, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { refreshAlerts } from "@/lib/notifications";
import { formatDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/admin/page-header";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { NotificationItem, MarkAllButton } from "@/components/admin/notification-actions";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = (Array.isArray(params.vue) ? params.vue[0] : params.vue) ?? "";

  // On rafraîchit les alertes à l'ouverture : la page reflète toujours l'état
  // réel de la flotte, sans tâche planifiée à configurer.
  await refreshAlerts().catch(() => undefined);

  const [notifications, unreadCount, totalCount] = await Promise.all([
    db.notification.findMany({
      where: view === "lues" ? { isRead: true } : view === "" ? { isRead: false } : {},
      orderBy: [{ createdAt: "desc" }],
      take: 80,
      select: {
        id: true,
        type: true,
        severity: true,
        title: true,
        message: true,
        link: true,
        isRead: true,
        createdAt: true,
      },
    }),
    db.notification.count({ where: { isRead: false } }),
    db.notification.count(),
  ]);

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Alertes de maintenance, échéances administratives et mouvements de réservation."
        actions={unreadCount > 0 ? <MarkAllButton /> : undefined}
      />

      <div className="space-y-4">
        <FilterTabs
          param="vue"
          options={[
            { value: "", label: "Non lues", count: unreadCount },
            { value: "lues", label: "Lues", count: totalCount - unreadCount },
            { value: "toutes", label: "Toutes", count: totalCount },
          ]}
        />

        {notifications.length === 0 ? (
          <EmptyState
            icon={view === "" ? CheckCircle2 : Bell}
            title={
              view === ""
                ? "Aucune notification non lue"
                : "Aucune notification à afficher"
            }
            description={
              view === ""
                ? "Vidanges, assurances et visites techniques sont à jour, et toutes les demandes ont été traitées."
                : "Les alertes apparaîtront ici dès qu'une échéance approche."
            }
          />
        ) : (
          <ul className="space-y-2">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={{
                  ...notification,
                  createdAtLabel: formatDateTime(notification.createdAt),
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
