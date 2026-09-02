import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarCheck,
  Car,
  CheckCircle2,
  Clock,
  Droplets,
  FileWarning,
  KeyRound,
  LogIn,
  LogOut,
  ShieldAlert,
  Wallet,
  Wrench,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { refreshAlerts } from "@/lib/notifications";
import {
  getDashboardAlerts,
  getFinanceStats,
  getFleetStats,
  getMaintenanceStats,
  getReservationStats,
  getRevenueSeries,
  getTodayAgenda,
} from "@/server/queries/dashboard";
import { formatMoney } from "@/lib/money";
import { formatDateShort, formatTime } from "@/lib/dates";
import { RESERVATION_STATUS } from "@/lib/labels";
import { StatCard } from "@/components/admin/stat-card";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const metadata = { title: "Tableau de bord" };

const SEVERITY_STYLES = {
  DANGER: "border-s-[var(--color-danger)] bg-[var(--color-danger-soft)]/50",
  WARNING: "border-s-[var(--color-warning)] bg-[var(--color-warning-soft)]/50",
  SUCCESS: "border-s-[var(--color-success)] bg-[var(--color-success-soft)]/50",
  INFO: "border-s-[var(--color-info)] bg-[var(--color-info-soft)]/50",
} as const;

export default async function DashboardPage() {
  const user = await requireUser();

  // Les alertes sont recalculées à l'ouverture du dashboard : l'agence n'a
  // aucune tâche planifiée à installer pour être prévenue des échéances.
  await refreshAlerts().catch(() => undefined);

  const [fleet, reservations, maintenance, finance, series, agenda, alerts] =
    await Promise.all([
      getFleetStats(),
      getReservationStats(),
      getMaintenanceStats(),
      getFinanceStats(),
      getRevenueSeries(6),
      getTodayAgenda(),
      getDashboardAlerts(6),
    ]);

  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-7">
      {/* ------------------------- En-tête ------------------------- */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.65rem] font-semibold tracking-tight text-navy-950">
            Bonjour {firstName}
          </h1>
          <p className="mt-1 text-[13.5px] text-navy-500">
            {new Intl.DateTimeFormat("fr-MA", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date())}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/calendrier">
              <CalendarCheck className="size-4" />
              Calendrier
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/reservations?statut=PENDING">
              Demandes en attente
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ------------------------- KPI ------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Véhicules disponibles"
          value={`${fleet.available} / ${fleet.total}`}
          hint={`${fleet.rented} en location · ${fleet.maintenance} au garage`}
          icon={Car}
          tone={fleet.available > 0 ? "success" : "warning"}
          href="/admin/vehicules"
        />
        <StatCard
          label="Demandes en attente"
          value={reservations.pending}
          hint={reservations.pending > 0 ? "À valider ou refuser" : "Rien à traiter"}
          icon={Clock}
          tone={reservations.pending > 0 ? "warning" : "neutral"}
          href="/admin/reservations?statut=PENDING"
        />
        <StatCard
          label="Locations en cours"
          value={reservations.active}
          hint={`${reservations.confirmed} confirmée(s) à venir`}
          icon={KeyRound}
          tone="info"
          href="/admin/locations"
        />
        <StatCard
          label="Encaissé ce mois-ci"
          value={formatMoney(finance.monthRevenue)}
          hint={`${formatMoney(finance.weekRevenue)} sur 7 jours`}
          icon={Wallet}
          tone="success"
          href="/admin/paiements"
        />
      </div>

      {/* ------------------- Alertes + échéances ------------------- */}
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-[var(--radius-card)] border border-navy-100 bg-white shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
            <h2 className="flex items-center gap-2 text-[14.5px] font-semibold text-navy-900">
              <Bell className="size-4 text-navy-400" />
              Alertes
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/notifications">Tout voir</Link>
            </Button>
          </div>

          {alerts.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle2 className="mx-auto size-8 text-[var(--color-success)]" />
              <p className="mt-3 text-[14px] font-medium text-navy-900">
                Aucune alerte en cours
              </p>
              <p className="mt-1 text-[13px] text-navy-500">
                Vidanges, assurances et visites techniques sont à jour.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-navy-50">
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <Link
                    href={alert.link ?? "/admin/notifications"}
                    className={cn(
                      "flex items-start gap-3 border-s-[3px] px-5 py-3.5 transition-colors hover:bg-navy-50/60",
                      SEVERITY_STYLES[alert.severity],
                    )}
                  >
                    <AlertIcon type={alert.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-navy-900">
                        {alert.title}
                      </p>
                      {alert.message ? (
                        <p className="mt-0.5 line-clamp-2 text-[12.5px] text-navy-500">
                          {alert.message}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[11.5px] text-navy-400">
                      {formatDateShort(alert.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="self-start rounded-[var(--radius-card)] border border-navy-100 bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-[14.5px] font-semibold text-navy-900">
            Échéances de la flotte
          </h2>
          <ul className="mt-4 space-y-3">
            <DeadlineRow
              icon={Droplets}
              label="Vidanges dépassées"
              value={maintenance.oilOverdue}
              tone="danger"
            />
            <DeadlineRow
              icon={Droplets}
              label="Vidanges proches"
              value={maintenance.oilDue}
              tone="warning"
            />
            <DeadlineRow
              icon={ShieldAlert}
              label="Assurances à renouveler"
              value={maintenance.insuranceExpiring}
              tone="warning"
            />
            <DeadlineRow
              icon={FileWarning}
              label="Visites techniques"
              value={maintenance.inspectionExpiring}
              tone="warning"
            />
            <DeadlineRow
              icon={Wrench}
              label="Immobilisations garage"
              value={maintenance.plannedMaintenance}
              tone="info"
            />
          </ul>
          <Button asChild variant="outline" size="sm" className="mt-5 w-full">
            <Link href="/admin/maintenance">Ouvrir la maintenance</Link>
          </Button>
        </section>
      </div>

      {/* ------------------------ Graphiques ------------------------ */}
      <DashboardCharts data={series} />

      {/* ------------------- Journée en cours ------------------- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <AgendaCard
          title="Départs aujourd'hui"
          icon={LogOut}
          emptyLabel="Aucun départ prévu aujourd'hui."
          items={agenda.departures.map((item) => ({
            id: item.id,
            href: `/admin/reservations/${item.id}`,
            primary: `${item.vehicle.brand} ${item.vehicle.model}`,
            secondary: `${item.customer.firstName} ${item.customer.lastName} · ${item.customer.phone}`,
            meta: formatTime(item.startAt),
            reference: item.reference,
          }))}
        />
        <AgendaCard
          title="Retours attendus"
          icon={LogIn}
          emptyLabel="Aucun retour attendu aujourd'hui."
          items={agenda.returns.map((item) => ({
            id: item.id,
            href: `/admin/locations`,
            primary: `${item.vehicle.brand} ${item.vehicle.model}`,
            secondary: `${item.customer.firstName} ${item.customer.lastName} · ${item.customer.phone}`,
            meta: item.endAt < new Date() ? "En retard" : formatTime(item.endAt),
            reference: item.reference,
            late: item.endAt < new Date(),
          }))}
        />
      </div>

      {/* ------------------- Demandes à traiter ------------------- */}
      <section className="rounded-[var(--radius-card)] border border-navy-100 bg-white shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
          <h2 className="text-[14.5px] font-semibold text-navy-900">
            Demandes de réservation à traiter
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/reservations">Tout voir</Link>
          </Button>
        </div>

        {agenda.pendingRequests.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Aucune demande en attente"
            description="Toutes les demandes reçues ont été traitées."
            className="m-5 border-0 bg-transparent py-8"
          />
        ) : (
          <ul className="divide-y divide-navy-50">
            {agenda.pendingRequests.map((request) => (
              <li key={request.id}>
                <Link
                  href={`/admin/reservations/${request.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-navy-50/60"
                >
                  <span className="font-mono text-[12px] font-semibold text-navy-400">
                    {request.reference}
                  </span>
                  <span className="text-[13.5px] font-semibold text-navy-900">
                    {request.vehicle.brand} {request.vehicle.model}
                  </span>
                  <span className="text-[13px] text-navy-500">
                    {request.customer.firstName} {request.customer.lastName}
                  </span>
                  <span className="text-[13px] text-navy-500">
                    {formatDateShort(request.startAt)} → {formatDateShort(request.endAt)}
                  </span>
                  <span className="ms-auto flex items-center gap-3">
                    <span className="text-[13.5px] font-semibold tabular-nums text-navy-900">
                      {formatMoney(request.totalAmount)}
                    </span>
                    <StatusBadge status={RESERVATION_STATUS[request.status]} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AlertIcon({ type }: { type: string }) {
  const Icon =
    type === "MAINTENANCE_DUE" || type === "MAINTENANCE_OVERDUE"
      ? Droplets
      : type === "INSURANCE_EXPIRING" || type === "INSPECTION_EXPIRING"
        ? ShieldAlert
        : type === "NEW_RESERVATION"
          ? CalendarCheck
          : AlertTriangle;
  return <Icon className="mt-0.5 size-4 shrink-0 text-navy-400" />;
}

function DeadlineRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "danger" | "warning" | "info";
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2.5 text-[13.5px] text-navy-600">
        <Icon className="size-4 text-navy-300" />
        {label}
      </span>
      {value > 0 ? (
        <Badge tone={tone} dot>
          {value}
        </Badge>
      ) : (
        <span className="text-[13px] font-medium text-navy-300">0</span>
      )}
    </li>
  );
}

function AgendaCard({
  title,
  icon: Icon,
  items,
  emptyLabel,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: {
    id: string;
    href: string;
    primary: string;
    secondary: string;
    meta: string;
    reference: string;
    late?: boolean;
  }[];
  emptyLabel: string;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-navy-100 bg-white shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 border-b border-navy-100 px-5 py-4">
        <Icon className="size-4 text-navy-400" />
        <h2 className="text-[14.5px] font-semibold text-navy-900">{title}</h2>
        <span className="ms-auto text-[12.5px] text-navy-400">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-navy-400">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-navy-50">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-navy-50/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-navy-900">
                    {item.primary}
                  </p>
                  <p className="truncate text-[12.5px] text-navy-500">
                    {item.secondary}
                  </p>
                </div>
                <Badge tone={item.late ? "danger" : "neutral"}>{item.meta}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
