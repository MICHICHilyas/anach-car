import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CreditCard,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldAlert,
} from "lucide-react";
import { db } from "@/lib/db";
import { updateCustomerNotes } from "@/server/actions/customers";
import { formatDateShort, formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import {
  CUSTOMER_STATUS,
  DOCUMENT_TYPE,
  PAYMENT_METHOD,
  PAYMENT_TYPE,
  RESERVATION_STATUS,
} from "@/lib/labels";
import { whatsappToCustomer } from "@/lib/whatsapp";
import { PageHeader } from "@/components/admin/page-header";
import { CustomerDialog } from "@/components/admin/customer-dialog";
import { InternalNotes } from "@/components/admin/internal-notes";
import { DocumentUpload } from "@/components/admin/document-upload";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    select: { firstName: true, lastName: true },
  });
  return {
    title: customer ? `${customer.firstName} ${customer.lastName}` : "Client",
  };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      reservations: {
        orderBy: { startAt: "desc" },
        include: {
          vehicle: { select: { brand: true, model: true, plate: true } },
        },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        take: 20,
      },
      documents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          title: true,
          fileName: true,
          expiresAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (!customer) notFound();

  const fullName = `${customer.firstName} ${customer.lastName}`;
  const totalSpent = customer.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const completed = customer.reservations.filter(
    (reservation) => reservation.status === "COMPLETED",
  ).length;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Clients", href: "/admin/clients" }, { label: fullName }]}
        title={fullName}
        description={`${customer.reservations.length} réservation(s) · ${completed} location(s) terminée(s) · client depuis le ${formatDateShort(customer.createdAt)}`}
        actions={
          <CustomerDialog
            customerId={customer.id}
            initialValues={{
              firstName: customer.firstName,
              lastName: customer.lastName,
              phone: customer.phone,
              email: customer.email ?? "",
              cin: customer.cin ?? "",
              licenseNumber: customer.licenseNumber ?? "",
              country: customer.country,
              city: customer.city ?? "",
              address: customer.address ?? "",
              internalNotes: customer.internalNotes ?? "",
            }}
          />
        }
      />

      {customer.status === "BLACKLISTED" ? (
        <div className="mb-5 flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] px-5 py-3.5">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[var(--color-danger)]" />
          <p className="text-[13.5px] font-medium text-[var(--color-danger)]">
            Ce client est en liste noire. Vérifiez avec la direction avant toute
            nouvelle location.
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        {/* ---------------------- Colonne identité ---------------------- */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
              <StatusBadge status={CUSTOMER_STATUS[customer.status]} />
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-3 text-[13px]">
                <Row icon={Phone} label="Téléphone" value={customer.phone} />
                {customer.email ? (
                  <Row icon={Mail} label="Email" value={customer.email} />
                ) : null}
                {customer.cin ? (
                  <Row icon={CreditCard} label="CIN / Passeport" value={customer.cin} />
                ) : null}
                {customer.licenseNumber ? (
                  <Row
                    icon={CreditCard}
                    label="Permis de conduire"
                    value={customer.licenseNumber}
                  />
                ) : null}
                <Row
                  icon={MapPin}
                  label="Adresse"
                  value={
                    [customer.address, customer.city, customer.country]
                      .filter(Boolean)
                      .join(", ") || customer.country
                  }
                />
              </dl>

              <div className="flex gap-2 border-t border-navy-100 pt-4">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <a href={`tel:${customer.phone.replace(/\s/g, "")}`}>
                    <Phone className="size-3.5" />
                    Appeler
                  </a>
                </Button>
                <Button asChild variant="whatsapp" size="sm" className="flex-1">
                  <a
                    href={whatsappToCustomer(
                      customer.phone,
                      `Bonjour ${customer.firstName}, ici Anach Car.`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="size-3.5" />
                    WhatsApp
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chiffres</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                <Metric label="Réservations" value={String(customer.reservations.length)} />
                <Metric label="Terminées" value={String(completed)} />
                <Metric label="Total encaissé" value={formatMoney(totalSpent)} />
                <Metric label="Documents" value={String(customer.documents.length)} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Note interne</CardTitle>
            </CardHeader>
            <CardContent>
              <InternalNotes
                initialValue={customer.internalNotes ?? ""}
                onSave={updateCustomerNotes.bind(null, customer.id)}
              />
            </CardContent>
          </Card>
        </div>

        {/* ---------------------- Colonne activité ---------------------- */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Réservations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {customer.reservations.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-navy-400">
                  Aucune réservation pour ce client.
                </p>
              ) : (
                <ul className="divide-y divide-navy-50">
                  {customer.reservations.map((reservation) => (
                    <li key={reservation.id}>
                      <Link
                        href={`/admin/reservations/${reservation.id}`}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3.5 transition-colors hover:bg-navy-50/60"
                      >
                        <span className="font-mono text-[12px] text-navy-400">
                          {reservation.reference}
                        </span>
                        <span className="text-[13.5px] font-medium text-navy-900">
                          {reservation.vehicle.brand} {reservation.vehicle.model}
                        </span>
                        <span className="text-[12.5px] text-navy-500">
                          {formatDateShort(reservation.startAt)} →{" "}
                          {formatDateShort(reservation.endAt)}
                        </span>
                        <span className="ms-auto flex items-center gap-3">
                          <span className="text-[13px] font-semibold tabular-nums text-navy-900">
                            {formatMoney(reservation.totalAmount)}
                          </span>
                          <StatusBadge
                            status={RESERVATION_STATUS[reservation.status]}
                            dot={false}
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4 text-navy-300" />
                Documents
              </CardTitle>
              <DocumentUpload customerId={customer.id} />
            </CardHeader>
            <CardContent className="p-0">
              {customer.documents.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-navy-400">
                  Aucun document. Les pièces déposées ici ne sont accessibles
                  qu&apos;aux utilisateurs connectés.
                </p>
              ) : (
                <ul className="divide-y divide-navy-50">
                  {customer.documents.map((document) => (
                    <li
                      key={document.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5"
                    >
                      <FileText className="size-4 shrink-0 text-navy-300" />
                      <a
                        href={`/api/admin/documents/${document.id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13.5px] font-medium text-navy-900 hover:text-teal-700"
                      >
                        {document.title ?? document.fileName}
                      </a>
                      <span className="text-[12px] text-navy-400">
                        {DOCUMENT_TYPE[document.type]}
                      </span>
                      {document.expiresAt ? (
                        <span className="text-[12px] text-[var(--color-warning)]">
                          expire le {formatDateShort(document.expiresAt)}
                        </span>
                      ) : null}
                      <span className="ms-auto text-[11.5px] text-navy-400">
                        {formatDateShort(document.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paiements</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {customer.payments.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-navy-400">
                  Aucun paiement enregistré.
                </p>
              ) : (
                <ul className="divide-y divide-navy-50">
                  {customer.payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3"
                    >
                      <span className="text-[13px] font-semibold tabular-nums text-navy-900">
                        {formatMoney(payment.amount)}
                      </span>
                      <span className="text-[12.5px] text-navy-500">
                        {PAYMENT_TYPE[payment.type]} · {PAYMENT_METHOD[payment.method]}
                      </span>
                      <span className="ms-auto text-[12px] text-navy-400">
                        {formatDateTime(payment.paidAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-navy-300" />
      <div className="min-w-0">
        <dt className="text-[11.5px] text-navy-400">{label}</dt>
        <dd className="break-words font-medium text-navy-900">{value}</dd>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-navy-50/70 px-4 py-3">
      <dt className="text-[11.5px] text-navy-400">{label}</dt>
      <dd className="mt-1 text-[15px] font-semibold tabular-nums text-navy-950">
        {value}
      </dd>
    </div>
  );
}
