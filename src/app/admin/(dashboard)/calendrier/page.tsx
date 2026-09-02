import Link from "next/link";
import { ChevronLeft, ChevronRight, KeyRound, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/dates";
import { RESERVATION_STATUS } from "@/lib/labels";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const metadata = { title: "Calendrier" };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Planning de la flotte : une ligne par véhicule, une colonne par jour.
 *
 * C'est la vue que l'agence ouvre le matin — elle répond d'un regard à
 * « quelle voiture est libre, quand, et pour qui ». Les barres sont
 * positionnées en pourcentage de la largeur du mois, ce qui reste lisible
 * du grand écran au téléphone (avec défilement horizontal).
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const monthParam = Array.isArray(params.mois) ? params.mois[0] : params.mois;

  const today = new Date();
  const [year, month] = monthParam?.match(/^\d{4}-\d{2}$/)
    ? monthParam.split("-").map(Number)
    : [today.getFullYear(), today.getMonth() + 1];

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const daysInMonth = Math.round((monthEnd.getTime() - monthStart.getTime()) / DAY_MS);

  const previousMonth = new Date(year, month - 2, 1);
  const nextMonth = new Date(year, month, 1);
  const monthKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  const [vehicles, reservations, maintenances] = await Promise.all([
    db.vehicle.findMany({
      where: { archivedAt: null },
      orderBy: [{ brand: "asc" }, { model: "asc" }],
      select: { id: true, brand: true, model: true, plate: true },
    }),
    db.reservation.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
        startAt: { lt: monthEnd },
        endAt: { gt: monthStart },
      },
      select: {
        id: true,
        reference: true,
        vehicleId: true,
        startAt: true,
        endAt: true,
        status: true,
        customer: { select: { firstName: true, lastName: true } },
      },
    }),
    db.maintenance.findMany({
      where: {
        status: { in: ["PLANNED", "IN_PROGRESS"] },
        startAt: { lt: monthEnd },
        endAt: { gt: monthStart },
      },
      select: {
        id: true,
        vehicleId: true,
        startAt: true,
        endAt: true,
        description: true,
      },
    }),
  ]);

  /** Position d'une période dans le mois, en pourcentage. */
  function bar(start: Date, end: Date) {
    const from = Math.max(start.getTime(), monthStart.getTime());
    const to = Math.min(end.getTime(), monthEnd.getTime());
    const left = ((from - monthStart.getTime()) / (daysInMonth * DAY_MS)) * 100;
    const width = ((to - from) / (daysInMonth * DAY_MS)) * 100;
    return { left: `${left}%`, width: `${Math.max(width, 1.6)}%` };
  }

  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month - 1, index + 1);
    return {
      day: index + 1,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isToday: date.toDateString() === today.toDateString(),
    };
  });

  const monthLabel = new Intl.DateTimeFormat("fr-MA", {
    month: "long",
    year: "numeric",
  }).format(monthStart);

  return (
    <>
      <PageHeader
        title="Calendrier de la flotte"
        description="Réservations, locations en cours et immobilisations garage, véhicule par véhicule."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="icon-sm">
              <Link
                href={`/admin/calendrier?mois=${monthKey(previousMonth)}`}
                aria-label="Mois précédent"
              >
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <span className="min-w-[10rem] text-center text-[14px] font-semibold capitalize text-navy-900">
              {monthLabel}
            </span>
            <Button asChild variant="outline" size="icon-sm">
              <Link
                href={`/admin/calendrier?mois=${monthKey(nextMonth)}`}
                aria-label="Mois suivant"
              >
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-4 text-[12.5px] text-navy-500">
        <Legend className="bg-teal-500" label="Location en cours" />
        <Legend className="bg-[var(--color-info)]" label="Confirmée" />
        <Legend className="bg-[var(--color-warning)]" label="En attente" />
        <Legend className="bg-navy-400" label="Immobilisation garage" />
      </div>

      {vehicles.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Aucun véhicule en flotte"
          description="Ajoutez des véhicules pour voir apparaître le planning."
        />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-navy-100 bg-white shadow-[var(--shadow-soft)]">
          <div className="min-w-[900px]">
            {/* En-tête : numéros de jours */}
            <div className="flex border-b border-navy-100 bg-navy-50/60">
              <div className="w-[200px] shrink-0 px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-navy-500">
                Véhicule
              </div>
              <div className="relative flex flex-1">
                {days.map((day) => (
                  <div
                    key={day.day}
                    className={cn(
                      "flex-1 border-s border-navy-100/70 py-2.5 text-center text-[11px]",
                      day.isToday
                        ? "font-bold text-teal-700"
                        : day.isWeekend
                          ? "text-navy-300"
                          : "text-navy-400",
                    )}
                  >
                    {day.day}
                  </div>
                ))}
              </div>
            </div>

            {/* Une ligne par véhicule */}
            {vehicles.map((vehicle) => {
              const vehicleReservations = reservations.filter(
                (reservation) => reservation.vehicleId === vehicle.id,
              );
              const vehicleMaintenances = maintenances.filter(
                (maintenance) => maintenance.vehicleId === vehicle.id,
              );

              return (
                <div
                  key={vehicle.id}
                  className="flex border-b border-navy-50 last:border-0"
                >
                  <div className="w-[200px] shrink-0 px-4 py-3">
                    <Link
                      href={`/admin/vehicules/${vehicle.id}`}
                      className="block truncate text-[13px] font-medium text-navy-900 hover:text-teal-700"
                    >
                      {vehicle.brand} {vehicle.model}
                    </Link>
                    <span className="block font-mono text-[11px] text-navy-400">
                      {vehicle.plate}
                    </span>
                  </div>

                  <div className="relative flex-1">
                    {/* Trame de fond : un trait par jour */}
                    <div className="absolute inset-0 flex">
                      {days.map((day) => (
                        <div
                          key={day.day}
                          className={cn(
                            "flex-1 border-s border-navy-50",
                            day.isWeekend && "bg-navy-50/40",
                            day.isToday && "bg-teal-50/60",
                          )}
                        />
                      ))}
                    </div>

                    <div className="relative space-y-1 py-2">
                      {vehicleMaintenances.map((maintenance) => (
                        <div
                          key={maintenance.id}
                          style={bar(maintenance.startAt, maintenance.endAt)}
                          title={`Garage : ${maintenance.description ?? "immobilisation"} (${formatDateShort(maintenance.startAt)} → ${formatDateShort(maintenance.endAt)})`}
                          className="absolute flex h-6 items-center overflow-hidden rounded-md bg-navy-400 px-2 text-[10.5px] font-medium text-white"
                        >
                          <Wrench className="me-1 size-3 shrink-0" />
                          <span className="truncate">Garage</span>
                        </div>
                      ))}

                      {vehicleReservations.map((reservation, index) => (
                        <Link
                          key={reservation.id}
                          href={`/admin/reservations/${reservation.id}`}
                          style={{
                            ...bar(reservation.startAt, reservation.endAt),
                            top: `${(vehicleMaintenances.length + index) * 28 + 8}px`,
                          }}
                          title={`${reservation.reference} · ${reservation.customer.firstName} ${reservation.customer.lastName} · ${formatDateShort(reservation.startAt)} → ${formatDateShort(reservation.endAt)}`}
                          className={cn(
                            "absolute flex h-6 items-center overflow-hidden rounded-md px-2 text-[10.5px] font-medium text-white transition-opacity hover:opacity-90",
                            reservation.status === "ACTIVE"
                              ? "bg-teal-500"
                              : reservation.status === "CONFIRMED"
                                ? "bg-[var(--color-info)]"
                                : "bg-[var(--color-warning)]",
                          )}
                        >
                          <span className="truncate">
                            {reservation.customer.firstName}{" "}
                            {reservation.customer.lastName.charAt(0)}.
                          </span>
                        </Link>
                      ))}
                    </div>

                    {/* Hauteur minimale pour garder les lignes alignées */}
                    <div
                      style={{
                        height: `${Math.max(1, vehicleReservations.length + vehicleMaintenances.length) * 28 + 8}px`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Liste de secours : sur petit écran, un tableau reste plus lisible */}
      <div className="mt-6 lg:hidden">
        <h2 className="mb-3 text-[14px] font-semibold text-navy-900">
          Détail du mois
        </h2>
        <ul className="space-y-2">
          {reservations.map((reservation) => (
            <li key={reservation.id}>
              <Link
                href={`/admin/reservations/${reservation.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-navy-100 bg-white px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-navy-900">
                    {reservation.customer.firstName} {reservation.customer.lastName}
                  </span>
                  <span className="block text-[12px] text-navy-400">
                    {formatDateShort(reservation.startAt)} →{" "}
                    {formatDateShort(reservation.endAt)}
                  </span>
                </span>
                <Badge tone={RESERVATION_STATUS[reservation.status].tone}>
                  {RESERVATION_STATUS[reservation.status].label}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn("size-3 rounded", className)} />
      {label}
    </span>
  );
}
