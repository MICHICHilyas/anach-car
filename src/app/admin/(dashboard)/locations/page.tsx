import Link from "next/link";
import { AlertTriangle, KeyRound } from "lucide-react";
import { db } from "@/lib/db";
import { formatDateTime, formatDateShort } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { FUEL_LEVEL, PAYMENT_STATUS } from "@/lib/labels";
import { PageHeader } from "@/components/admin/page-header";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Locations" };

/**
 * Locations réellement en cours et historique des retours.
 * L'agence y suit ce qui est physiquement sorti du parking.
 */
export default async function RentalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = (Array.isArray(params.vue) ? params.vue[0] : params.vue) ?? "";

  const now = new Date();
  const [active, finished] = await Promise.all([
    db.rental.findMany({
      where: { endedAt: null },
      orderBy: { startedAt: "asc" },
      include: {
        vehicle: { select: { id: true, brand: true, model: true, plate: true } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        reservation: {
          select: {
            id: true,
            reference: true,
            endAt: true,
            totalAmount: true,
            paymentStatus: true,
          },
        },
      },
    }),
    db.rental.findMany({
      where: { endedAt: { not: null } },
      orderBy: { endedAt: "desc" },
      take: 40,
      include: {
        vehicle: { select: { id: true, brand: true, model: true, plate: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
        reservation: { select: { id: true, reference: true, totalAmount: true } },
      },
    }),
  ]);

  const showFinished = view === "terminees";

  return (
    <>
      <PageHeader
        title="Locations"
        description={`${active.length} véhicule(s) actuellement chez un client`}
      />

      <div className="space-y-4">
        <FilterTabs
          param="vue"
          options={[
            { value: "", label: "En cours", count: active.length },
            { value: "terminees", label: "Terminées", count: finished.length },
          ]}
        />

        {showFinished ? (
          finished.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="Aucune location terminée"
              description="Les retours enregistrés apparaîtront ici."
            />
          ) : (
            <ul className="space-y-3">
              {finished.map((rental) => (
                <li key={rental.id}>
                  <Card>
                    <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/reservations/${rental.reservation.id}`}
                          className="text-[14px] font-semibold text-navy-900 hover:text-teal-700"
                        >
                          {rental.vehicle.brand} {rental.vehicle.model}
                        </Link>
                        <p className="text-[12.5px] text-navy-400">
                          {rental.customer.firstName} {rental.customer.lastName} ·{" "}
                          {rental.reservation.reference}
                        </p>
                      </div>
                      <div className="text-[12.5px] text-navy-500">
                        {formatDateShort(rental.startedAt)} →{" "}
                        {rental.endedAt ? formatDateShort(rental.endedAt) : "—"}
                      </div>
                      <div className="text-[12.5px] text-navy-500">
                        {(
                          (rental.endMileage ?? 0) - rental.startMileage
                        ).toLocaleString("fr-MA")}{" "}
                        km parcourus
                      </div>
                      <div className="text-[14px] font-semibold tabular-nums text-navy-900">
                        {formatMoney(rental.finalAmount ?? rental.reservation.totalAmount)}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )
        ) : active.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="Aucune location en cours"
            description="Les véhicules remis à un client apparaîtront ici jusqu'à leur retour."
            action={
              <Button asChild variant="outline">
                <Link href="/admin/reservations?statut=CONFIRMED">
                  Voir les départs à préparer
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {active.map((rental) => {
              const late = rental.reservation.endAt < now;
              return (
                <li key={rental.id}>
                  <Card className={late ? "border-[var(--color-danger)]/30" : undefined}>
                    <CardContent className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <Link
                            href={`/admin/vehicules/${rental.vehicle.id}`}
                            className="text-[15px] font-semibold text-navy-950 hover:text-teal-700"
                          >
                            {rental.vehicle.brand} {rental.vehicle.model}
                          </Link>
                          <p className="font-mono text-[12px] text-navy-400">
                            {rental.vehicle.plate}
                          </p>
                        </div>
                        {late ? (
                          <Badge tone="danger" dot>
                            <AlertTriangle className="size-3" />
                            Retour en retard
                          </Badge>
                        ) : (
                          <Badge tone="success" dot>
                            En cours
                          </Badge>
                        )}
                      </div>

                      <dl className="grid grid-cols-2 gap-3 text-[13px]">
                        <div>
                          <dt className="text-[11.5px] text-navy-400">Client</dt>
                          <dd className="font-medium text-navy-900">
                            <Link
                              href={`/admin/clients/${rental.customer.id}`}
                              className="hover:text-teal-700"
                            >
                              {rental.customer.firstName} {rental.customer.lastName}
                            </Link>
                          </dd>
                          <dd className="text-[12px] text-navy-400">
                            {rental.customer.phone}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11.5px] text-navy-400">Retour prévu</dt>
                          <dd
                            className={
                              late
                                ? "font-medium text-[var(--color-danger)]"
                                : "font-medium text-navy-900"
                            }
                          >
                            {formatDateTime(rental.reservation.endAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11.5px] text-navy-400">Départ</dt>
                          <dd className="text-navy-700">
                            {formatDateShort(rental.startedAt)} ·{" "}
                            {rental.startMileage.toLocaleString("fr-MA")} km
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11.5px] text-navy-400">Carburant</dt>
                          <dd className="text-navy-700">
                            {FUEL_LEVEL[rental.startFuel]}
                          </dd>
                        </div>
                      </dl>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-100 pt-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[14px] font-semibold tabular-nums text-navy-900">
                            {formatMoney(rental.reservation.totalAmount)}
                          </span>
                          <StatusBadge
                            status={PAYMENT_STATUS[rental.reservation.paymentStatus]}
                            dot={false}
                          />
                        </div>
                        <Button asChild size="sm">
                          <Link href={`/admin/reservations/${rental.reservation.id}`}>
                            Enregistrer le retour
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
