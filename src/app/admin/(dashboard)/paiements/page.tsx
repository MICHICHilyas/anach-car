import Link from "next/link";
import { Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { canSeeFinancials, requireUser } from "@/lib/auth";
import { formatDateShort } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_TYPE } from "@/lib/labels";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge, Badge } from "@/components/ui/badge";
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

export const metadata = { title: "Paiements" };

const REVENUE_TYPES = ["DEPOSIT", "BALANCE", "EXTRA_FEE"] as const;

export default async function PaymentsPage() {
  const user = await requireUser();
  /*
   * Les recettes du mois et de l'année ne concernent que le gérant. On ne se
   * contente pas de masquer les cartes : sans ce test, les montants seraient
   * calculés puis envoyés au navigateur d'un employé, où ils resteraient
   * lisibles dans le HTML.
   */
  const showTotals = canSeeFinancials(user);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [payments, monthTotal, yearTotal, unpaid] = await Promise.all([
    db.payment.findMany({
      orderBy: { paidAt: "desc" },
      take: 60,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        reservation: { select: { id: true, reference: true } },
        recordedBy: { select: { name: true } },
      },
    }),
    showTotals
      ? db.payment.aggregate({
          where: { paidAt: { gte: startOfMonth }, type: { in: [...REVENUE_TYPES] } },
          _sum: { amount: true },
        })
      : null,
    showTotals
      ? db.payment.aggregate({
          where: {
            paidAt: { gte: new Date(now.getFullYear(), 0, 1) },
            type: { in: [...REVENUE_TYPES] },
          },
          _sum: { amount: true },
        })
      : null,
    db.reservation.findMany({
      where: {
        status: { in: ["CONFIRMED", "ACTIVE", "COMPLETED"] },
        paymentStatus: { in: ["UNPAID", "DEPOSIT_PAID", "PARTIALLY_PAID"] },
      },
      orderBy: { startAt: "desc" },
      take: 20,
      select: {
        id: true,
        reference: true,
        totalAmount: true,
        paymentStatus: true,
        startAt: true,
        customer: { select: { firstName: true, lastName: true } },
        vehicle: { select: { brand: true, model: true } },
        payments: { select: { amount: true, type: true } },
      },
    }),
  ]);

  const outstandingTotal = unpaid.reduce((sum, reservation) => {
    const paid = reservation.payments.reduce(
      (total, payment) => total + payment.amount,
      0,
    );
    return sum + Math.max(0, reservation.totalAmount - paid);
  }, 0);

  return (
    <>
      <PageHeader
        title="Paiements"
        description="Suivi des encaissements, des acomptes et des sommes restant dues."
      />

      <div
        className={`mb-5 grid gap-4 ${showTotals ? "sm:grid-cols-3" : "sm:max-w-sm"}`}
      >
        {showTotals ? (
          <>
            <StatCard
              label="Encaissé ce mois-ci"
              value={formatMoney(monthTotal?._sum.amount ?? 0)}
              icon={Wallet}
              tone="success"
            />
            <StatCard
              label="Encaissé cette année"
              value={formatMoney(yearTotal?._sum.amount ?? 0)}
              icon={Wallet}
              tone="info"
            />
          </>
        ) : null}
        <StatCard
          label="Reste à encaisser"
          value={formatMoney(outstandingTotal)}
          hint={`${unpaid.length} dossier(s) concerné(s)`}
          icon={Wallet}
          tone={outstandingTotal > 0 ? "warning" : "neutral"}
        />
      </div>

      {unpaid.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-3 text-[15px] font-semibold text-navy-900">
            Dossiers à encaisser
          </h2>
          <TableWrapper>
            <Table>
              <Thead>
                <tr>
                  <Th>Référence</Th>
                  <Th>Client</Th>
                  <Th>Véhicule</Th>
                  <Th className="text-end">Total</Th>
                  <Th className="text-end">Encaissé</Th>
                  <Th className="text-end">Reste</Th>
                  <Th>Statut</Th>
                </tr>
              </Thead>
              <Tbody>
                {unpaid.map((reservation) => {
                  const paid = reservation.payments.reduce(
                    (total, payment) => total + payment.amount,
                    0,
                  );
                  const remaining = Math.max(0, reservation.totalAmount - paid);

                  return (
                    <Tr key={reservation.id}>
                      <Td>
                        <Link
                          href={`/admin/reservations/${reservation.id}`}
                          className="font-mono text-[12.5px] font-semibold text-teal-700 hover:underline"
                        >
                          {reservation.reference}
                        </Link>
                      </Td>
                      <Td className="text-[13px]">
                        {reservation.customer.firstName} {reservation.customer.lastName}
                      </Td>
                      <Td className="text-[13px]">
                        {reservation.vehicle.brand} {reservation.vehicle.model}
                      </Td>
                      <Td className="text-end tabular-nums">
                        {formatMoney(reservation.totalAmount)}
                      </Td>
                      <Td className="text-end tabular-nums text-navy-500">
                        {formatMoney(paid)}
                      </Td>
                      <Td className="text-end font-semibold tabular-nums text-[var(--color-warning)]">
                        {formatMoney(remaining)}
                      </Td>
                      <Td>
                        <StatusBadge
                          status={PAYMENT_STATUS[reservation.paymentStatus]}
                          dot={false}
                        />
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableWrapper>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-navy-900">
          Derniers mouvements
        </h2>
        {payments.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Aucun paiement enregistré"
            description="Les encaissements se saisissent depuis la fiche d'une réservation."
          />
        ) : (
          <TableWrapper>
            <Table>
              <Thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Référence</Th>
                  <Th>Client</Th>
                  <Th>Nature</Th>
                  <Th>Moyen</Th>
                  <Th>Saisi par</Th>
                  <Th className="text-end">Montant</Th>
                </tr>
              </Thead>
              <Tbody>
                {payments.map((payment) => (
                  <Tr key={payment.id}>
                    <Td className="whitespace-nowrap text-[12.5px]">
                      {formatDateShort(payment.paidAt)}
                    </Td>
                    <Td>
                      {payment.reservation ? (
                        <Link
                          href={`/admin/reservations/${payment.reservation.id}`}
                          className="font-mono text-[12px] text-teal-700 hover:underline"
                        >
                          {payment.reservation.reference}
                        </Link>
                      ) : (
                        <span className="text-navy-300">—</span>
                      )}
                    </Td>
                    <Td className="text-[13px]">
                      {payment.customer ? (
                        <Link
                          href={`/admin/clients/${payment.customer.id}`}
                          className="hover:text-teal-700"
                        >
                          {payment.customer.firstName} {payment.customer.lastName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <Badge tone="outline">{PAYMENT_TYPE[payment.type]}</Badge>
                    </Td>
                    <Td className="text-[12.5px] text-navy-500">
                      {PAYMENT_METHOD[payment.method]}
                    </Td>
                    <Td className="text-[12.5px] text-navy-400">
                      {payment.recordedBy?.name ?? "—"}
                    </Td>
                    <Td
                      className={
                        payment.amount < 0
                          ? "text-end font-semibold tabular-nums text-[var(--color-danger)]"
                          : "text-end font-semibold tabular-nums text-navy-900"
                      }
                    >
                      {formatMoney(payment.amount)}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableWrapper>
        )}
      </section>
    </>
  );
}
