import Link from "next/link";
import { Users } from "lucide-react";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/dates";
import { CUSTOMER_STATUS } from "@/lib/labels";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { CustomerDialog } from "@/components/admin/customer-dialog";
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

export const metadata = { title: "Clients" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;

  const where = {
    archivedAt: null,
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
            { email: { contains: q, mode: "insensitive" as const } },
            { cin: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const customers = await db.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      cin: true,
      country: true,
      status: true,
      createdAt: true,
      _count: { select: { reservations: true } },
      reservations: {
        orderBy: { startAt: "desc" },
        take: 1,
        select: { startAt: true, vehicle: { select: { brand: true, model: true } } },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Clients"
        description={`${customers.length} fiche${customers.length > 1 ? "s" : ""} client`}
        actions={<CustomerDialog />}
      />

      <div className="space-y-4">
        <SearchInput placeholder="Nom, téléphone, email, CIN…" />

        {customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun client trouvé"
            description="Les clients sont créés automatiquement à chaque réservation reçue depuis le site."
            action={
              <Button asChild variant="outline">
                <Link href="/admin/clients">Voir tous les clients</Link>
              </Button>
            }
          />
        ) : (
          <TableWrapper>
            <Table>
              <Thead>
                <tr>
                  <Th>Client</Th>
                  <Th>Contact</Th>
                  <Th>CIN / Passeport</Th>
                  <Th>Pays</Th>
                  <Th className="text-center">Réservations</Th>
                  <Th>Dernière location</Th>
                  <Th>Statut</Th>
                </tr>
              </Thead>
              <Tbody>
                {customers.map((customer) => (
                  <Tr key={customer.id}>
                    <Td>
                      <Link
                        href={`/admin/clients/${customer.id}`}
                        className="font-medium text-navy-900 hover:text-teal-700"
                      >
                        {customer.firstName} {customer.lastName}
                      </Link>
                      <span className="mt-0.5 block text-[11.5px] text-navy-400">
                        Client depuis le {formatDateShort(customer.createdAt)}
                      </span>
                    </Td>
                    <Td>
                      <span className="block text-[13px]">{customer.phone}</span>
                      {customer.email ? (
                        <span className="block text-[12px] text-navy-400">
                          {customer.email}
                        </span>
                      ) : null}
                    </Td>
                    <Td className="font-mono text-[12.5px]">{customer.cin ?? "—"}</Td>
                    <Td className="text-[13px]">{customer.country}</Td>
                    <Td className="text-center font-semibold tabular-nums">
                      {customer._count.reservations}
                    </Td>
                    <Td className="text-[12.5px] text-navy-500">
                      {customer.reservations[0] ? (
                        <>
                          {customer.reservations[0].vehicle.brand}{" "}
                          {customer.reservations[0].vehicle.model}
                          <span className="mt-0.5 block text-navy-400">
                            {formatDateShort(customer.reservations[0].startAt)}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={CUSTOMER_STATUS[customer.status]} />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableWrapper>
        )}
      </div>
    </>
  );
}
