import Link from "next/link";
import { CalendarX2, Plus } from "lucide-react";
import { listReservations } from "@/server/queries/reservations";
import { formatDateShort } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import {
  PAYMENT_STATUS,
  RESERVATION_SOURCE,
  RESERVATION_STATUS,
} from "@/lib/labels";
import { PageHeader } from "@/components/admin/page-header";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { SearchInput } from "@/components/admin/search-input";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableWrapper,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@/components/ui/table";

export const metadata = { title: "Réservations" };

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const { items, total, page, pageCount, counts } = await listReservations({
    status: single("statut"),
    q: single("q"),
    page: Number(single("page") ?? 1),
  });

  return (
    <>
      <PageHeader
        title="Réservations"
        description={`${total} dossier${total > 1 ? "s" : ""} · les demandes en attente sont à traiter en priorité`}
        actions={
          <Button asChild size="sm">
            <Link href="/admin/reservations/nouvelle">
              <Plus className="size-4" />
              Nouvelle réservation
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
        <FilterTabs
          param="statut"
          options={[
            { value: "", label: "Toutes", count: counts.all },
            { value: "PENDING", label: "En attente", count: counts.PENDING },
            { value: "CONFIRMED", label: "Confirmées", count: counts.CONFIRMED },
            { value: "ACTIVE", label: "En cours", count: counts.ACTIVE },
            { value: "COMPLETED", label: "Terminées", count: counts.COMPLETED },
            { value: "CANCELLED", label: "Annulées", count: counts.CANCELLED },
            { value: "REJECTED", label: "Refusées", count: counts.REJECTED },
          ]}
        />

        <SearchInput placeholder="Référence, client, téléphone, véhicule…" />

        {items.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title="Aucune réservation ne correspond"
            description="Modifiez le filtre ou la recherche pour élargir les résultats."
            action={
              <Button asChild variant="outline">
                <Link href="/admin/reservations">Voir toutes les réservations</Link>
              </Button>
            }
          />
        ) : (
          <>
            <TableWrapper>
              <Table>
                <Thead>
                  <tr>
                    <Th>Référence</Th>
                    <Th>Client</Th>
                    <Th>Véhicule</Th>
                    <Th>Période</Th>
                    <Th className="text-end">Montant</Th>
                    <Th>Paiement</Th>
                    <Th>Statut</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {items.map((reservation) => (
                    <Tr key={reservation.id}>
                      <Td>
                        <Link
                          href={`/admin/reservations/${reservation.id}`}
                          className="font-mono text-[12.5px] font-semibold text-teal-700 hover:underline"
                        >
                          {reservation.reference}
                        </Link>
                        <span className="mt-0.5 block text-[11.5px] text-navy-400">
                          {RESERVATION_SOURCE[reservation.source]}
                        </span>
                      </Td>
                      <Td>
                        <span className="block font-medium text-navy-900">
                          {reservation.customer.firstName} {reservation.customer.lastName}
                        </span>
                        <span className="block text-[12px] text-navy-400">
                          {reservation.customer.phone}
                        </span>
                      </Td>
                      <Td>
                        <span className="block font-medium text-navy-900">
                          {reservation.vehicle.brand} {reservation.vehicle.model}
                        </span>
                        <span className="block font-mono text-[11.5px] text-navy-400">
                          {reservation.vehicle.plate}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap text-[13px]">
                        {formatDateShort(reservation.startAt)}
                        <span className="mx-1 text-navy-300">→</span>
                        {formatDateShort(reservation.endAt)}
                        <span className="mt-0.5 block text-[11.5px] text-navy-400">
                          {reservation.days} jour{reservation.days > 1 ? "s" : ""}
                        </span>
                      </Td>
                      <Td className="text-end font-semibold tabular-nums">
                        {formatMoney(reservation.totalAmount)}
                      </Td>
                      <Td>
                        <StatusBadge
                          status={PAYMENT_STATUS[reservation.paymentStatus]}
                          dot={false}
                        />
                      </Td>
                      <Td>
                        <StatusBadge status={RESERVATION_STATUS[reservation.status]} />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableWrapper>

            {pageCount > 1 ? (
              <nav
                className="flex items-center justify-between gap-3"
                aria-label="Pagination"
              >
                <span className="text-[13px] text-navy-500">
                  Page {page} sur {pageCount}
                </span>
                <div className="flex gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                  >
                    <Link
                      href={`?${new URLSearchParams({
                        ...(single("statut") ? { statut: single("statut")! } : {}),
                        ...(single("q") ? { q: single("q")! } : {}),
                        page: String(Math.max(1, page - 1)),
                      })}`}
                    >
                      Précédent
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`?${new URLSearchParams({
                        ...(single("statut") ? { statut: single("statut")! } : {}),
                        ...(single("q") ? { q: single("q")! } : {}),
                        page: String(Math.min(pageCount, page + 1)),
                      })}`}
                    >
                      Suivant
                    </Link>
                  </Button>
                </div>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
