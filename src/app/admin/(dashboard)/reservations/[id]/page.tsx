import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Banknote,
  CalendarDays,
  Car,
  Clock,
  ExternalLink,
  FileText,
  Gauge,
  History,
  MapPin,
  MessageCircle,
  Phone,
  User,
} from "lucide-react";
import {
  getEntityHistory,
  getReservationDetail,
} from "@/server/queries/reservations";
import { updateReservationNotes } from "@/server/actions/reservations";
import { formatDateTime, formatDateShort } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import {
  FUEL_LEVEL,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  RESERVATION_SOURCE,
  RESERVATION_STATUS,
} from "@/lib/labels";
import { whatsappToCustomer } from "@/lib/whatsapp";
import { PageHeader } from "@/components/admin/page-header";
import { ReservationActions } from "@/components/admin/reservation-actions";
import { PaymentForm } from "@/components/admin/payment-form";
import { InternalNotes } from "@/components/admin/internal-notes";
import { DocumentUpload } from "@/components/admin/document-upload";
import { DocumentActions } from "@/components/admin/document-actions";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reservation = await getReservationDetail(id);
  return { title: reservation ? `Réservation ${reservation.reference}` : "Réservation" };
}

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reservation = await getReservationDetail(id);
  if (!reservation) notFound();

  const history = await getEntityHistory("Reservation", id);
  const status = RESERVATION_STATUS[reservation.status];
  const vehicleLabel = `${reservation.vehicle.brand} ${reservation.vehicle.model}`;
  const customerName = `${reservation.customer.firstName} ${reservation.customer.lastName}`;

  const paid = reservation.payments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const remaining = Math.max(0, reservation.totalAmount - paid);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Réservations", href: "/admin/reservations" },
          { label: reservation.reference },
        ]}
        title={reservation.reference}
        description={`${vehicleLabel} · ${customerName} · créée le ${formatDateShort(reservation.createdAt)} (${RESERVATION_SOURCE[reservation.source]})`}
        actions={
          <>
            <ReservationActions
            reservationId={reservation.id}
            reference={reservation.reference}
            status={reservation.status}
            vehicleMileage={reservation.vehicle.mileage}
              rental={reservation.rental}
            />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* ---------------------- Colonne principale ---------------------- */}
        <div className="space-y-5">
          {/* Statut */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-navy-400">
                  Statut du dossier
                </p>
                <div className="mt-1.5">
                  <StatusBadge status={status} />
                </div>
                <p className="mt-1.5 text-[12.5px] text-navy-500">
                  {status.description}
                </p>
              </div>

              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-navy-400">
                  Paiement
                </p>
                <div className="mt-1.5">
                  <StatusBadge
                    status={PAYMENT_STATUS[reservation.paymentStatus]}
                    dot={false}
                  />
                </div>
                <p className="mt-1.5 text-[12.5px] text-navy-500">
                  {formatMoney(paid)} encaissé · {formatMoney(remaining)} restant
                </p>
              </div>

              {reservation.confirmedBy ? (
                <div>
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-navy-400">
                    Confirmée par
                  </p>
                  <p className="mt-1.5 text-[13.5px] font-medium text-navy-900">
                    {reservation.confirmedBy.name}
                  </p>
                  {reservation.confirmedAt ? (
                    <p className="text-[12.5px] text-navy-500">
                      {formatDateShort(reservation.confirmedAt)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {reservation.cancellationReason ? (
                <div className="w-full rounded-lg bg-[var(--color-danger-soft)] px-3.5 py-2.5">
                  <p className="text-[12.5px] font-medium text-[var(--color-danger)]">
                    Motif : {reservation.cancellationReason}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Détail de la location */}
          <Card>
            <CardHeader>
              <CardTitle>Détail de la location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex gap-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-navy-50">
                  <Image
                    src={
                      reservation.vehicle.images[0]?.url ??
                      "/images/vehicle-placeholder.svg"
                    }
                    alt={vehicleLabel}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/admin/vehicules/${reservation.vehicle.id}`}
                    className="flex items-center gap-1.5 text-[15px] font-semibold text-navy-950 hover:text-teal-700"
                  >
                    <Car className="size-4 text-navy-300" />
                    {vehicleLabel} ({reservation.vehicle.year})
                  </Link>
                  <p className="mt-1 font-mono text-[12.5px] text-navy-400">
                    {reservation.vehicle.plate}
                  </p>
                  <p className="mt-1 text-[12.5px] text-navy-500">
                    <Gauge className="me-1 inline size-3.5" />
                    {reservation.vehicle.mileage.toLocaleString("fr-MA")} km
                  </p>
                </div>
              </div>

              <dl className="grid gap-4 border-t border-navy-100 pt-5 sm:grid-cols-2">
                <Detail icon={CalendarDays} label="Départ">
                  {formatDateTime(reservation.startAt)}
                </Detail>
                <Detail icon={CalendarDays} label="Retour">
                  {formatDateTime(reservation.endAt)}
                </Detail>
                <Detail icon={Clock} label="Durée">
                  {reservation.days} jour{reservation.days > 1 ? "s" : ""}
                </Detail>
                <Detail icon={Banknote} label="Tarif appliqué">
                  {formatMoney(reservation.dailyRate)} / jour
                </Detail>
                {reservation.pickupLocationLabel ? (
                  <Detail icon={MapPin} label="Prise en charge">
                    {reservation.pickupLocationLabel}
                  </Detail>
                ) : null}
                {reservation.dropoffLocationLabel ? (
                  <Detail icon={MapPin} label="Restitution">
                    {reservation.dropoffLocationLabel}
                  </Detail>
                ) : null}
              </dl>

              <div className="rounded-xl bg-navy-50/70 p-4">
                <dl className="space-y-2 text-[13.5px]">
                  <Line label="Sous-total" value={formatMoney(reservation.subtotal)} />
                  {reservation.extraFees > 0 ? (
                    <Line
                      label="Frais additionnels"
                      value={formatMoney(reservation.extraFees)}
                    />
                  ) : null}
                  {reservation.discount > 0 ? (
                    <Line
                      label="Remise"
                      value={`− ${formatMoney(reservation.discount)}`}
                      tone="success"
                    />
                  ) : null}
                  <div className="flex items-baseline justify-between border-t border-navy-200/70 pt-2">
                    <dt className="font-semibold text-navy-900">Total</dt>
                    <dd className="font-[family-name:var(--font-display)] text-[18px] font-bold tabular-nums text-navy-950">
                      {formatMoney(reservation.totalAmount)}
                    </dd>
                  </div>
                </dl>
              </div>

              {reservation.customerComment ? (
                <div className="rounded-xl border border-navy-100 p-4">
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-navy-400">
                    Message du client
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-navy-700">
                    {reservation.customerComment}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* État des lieux */}
          {reservation.rental ? (
            <Card>
              <CardHeader>
                <CardTitle>État des lieux</CardTitle>
                <Badge tone={reservation.rental.endedAt ? "neutral" : "success"} dot>
                  {reservation.rental.endedAt ? "Clôturée" : "En cours"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-teal-700">
                      Départ
                    </p>
                    <dl className="mt-3 space-y-2 text-[13.5px]">
                      <Line
                        label="Date"
                        value={formatDateTime(reservation.rental.startedAt)}
                      />
                      <Line
                        label="Kilométrage"
                        value={`${reservation.rental.startMileage.toLocaleString("fr-MA")} km`}
                      />
                      <Line
                        label="Carburant"
                        value={FUEL_LEVEL[reservation.rental.startFuel]}
                      />
                      {reservation.rental.checkedOutBy ? (
                        <Line
                          label="Par"
                          value={reservation.rental.checkedOutBy.name}
                          muted
                        />
                      ) : null}
                    </dl>
                    {reservation.rental.startConditionNotes ? (
                      <p className="mt-3 rounded-lg bg-navy-50 px-3 py-2 text-[12.5px] text-navy-600">
                        {reservation.rental.startConditionNotes}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-navy-400">
                      Retour
                    </p>
                    {reservation.rental.endedAt ? (
                      <>
                        <dl className="mt-3 space-y-2 text-[13.5px]">
                          <Line
                            label="Date"
                            value={formatDateTime(reservation.rental.endedAt)}
                          />
                          <Line
                            label="Kilométrage"
                            value={`${reservation.rental.endMileage?.toLocaleString("fr-MA")} km`}
                          />
                          <Line
                            label="Distance parcourue"
                            value={`${((reservation.rental.endMileage ?? 0) - reservation.rental.startMileage).toLocaleString("fr-MA")} km`}
                          />
                          <Line
                            label="Carburant"
                            value={
                              reservation.rental.endFuel
                                ? FUEL_LEVEL[reservation.rental.endFuel]
                                : "—"
                            }
                          />
                        </dl>
                        {reservation.rental.damageNotes ? (
                          <p className="mt-3 rounded-lg bg-[var(--color-warning-soft)] px-3 py-2 text-[12.5px] text-[var(--color-warning)]">
                            {reservation.rental.damageNotes}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-3 text-[13px] text-navy-400">
                        Le véhicule n&apos;a pas encore été rendu.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Paiements */}
          <Card>
            <CardHeader>
              <CardTitle>Paiements</CardTitle>
              <PaymentForm
                reservationId={reservation.id}
                suggestedAmount={remaining}
              />
            </CardHeader>
            <CardContent className="p-0">
              {reservation.payments.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-navy-400">
                  Aucun paiement enregistré pour ce dossier.
                </p>
              ) : (
                <ul className="divide-y divide-navy-50">
                  {reservation.payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5"
                    >
                      <span className="text-[13.5px] font-semibold tabular-nums text-navy-900">
                        {formatMoney(payment.amount)}
                      </span>
                      <Badge tone="outline">{PAYMENT_TYPE[payment.type]}</Badge>
                      <span className="text-[12.5px] text-navy-500">
                        {PAYMENT_METHOD[payment.method]}
                      </span>
                      <span className="text-[12.5px] text-navy-400">
                        {formatDateShort(payment.paidAt)}
                      </span>
                      {payment.recordedBy ? (
                        <span className="ms-auto text-[12px] text-navy-400">
                          {payment.recordedBy.name}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ---------------------- Colonne latérale ---------------------- */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/clients/${reservation.customer.id}`}>
                  Fiche
                  <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <p className="flex items-center gap-2.5 text-[14.5px] font-semibold text-navy-950">
                <User className="size-4 text-navy-300" />
                {customerName}
              </p>
              <dl className="space-y-2 text-[13px]">
                <Line label="Téléphone" value={reservation.customer.phone} />
                {reservation.customer.email ? (
                  <Line label="Email" value={reservation.customer.email} />
                ) : null}
                {reservation.customer.cin ? (
                  <Line label="CIN / Passeport" value={reservation.customer.cin} />
                ) : null}
                {reservation.customer.licenseNumber ? (
                  <Line label="Permis" value={reservation.customer.licenseNumber} />
                ) : null}
                <Line label="Pays" value={reservation.customer.country} />
              </dl>

              <div className="flex gap-2 pt-1">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <a href={`tel:${reservation.customer.phone.replace(/\s/g, "")}`}>
                    <Phone className="size-3.5" />
                    Appeler
                  </a>
                </Button>
                <Button asChild variant="whatsapp" size="sm" className="flex-1">
                  <a
                    href={whatsappToCustomer(
                      reservation.customer.phone,
                      `Bonjour ${reservation.customer.firstName}, au sujet de votre réservation ${reservation.reference} (${vehicleLabel}).`,
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
              <CardTitle>Note interne</CardTitle>
            </CardHeader>
            <CardContent>
              <InternalNotes
                initialValue={reservation.internalNotes ?? ""}
                onSave={updateReservationNotes.bind(null, reservation.id)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <DocumentUpload
                reservationId={reservation.id}
                customerId={reservation.customer.id}
              />
            </CardHeader>
            <CardContent className="p-0">
              {reservation.documents.length === 0 ? (
                <p className="px-5 py-6 text-center text-[13px] text-navy-400">
                  Aucun document joint.
                </p>
              ) : (
                <ul className="divide-y divide-navy-50">
                  {reservation.documents.map((document) => (
                    <li key={document.id} className="flex items-center gap-3 px-5 py-3">
                      <FileText className="size-4 shrink-0 text-navy-300" />
                      <a
                        href={`/api/admin/documents/${document.id}/file`}
                        className="min-w-0 flex-1 truncate text-[13px] text-navy-700 hover:text-teal-700"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {document.title ?? document.fileName}
                      </a>
                      <DocumentActions
                        documentId={document.id}
                        label={document.title ?? document.fileName}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-4 text-navy-300" />
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <p className="px-5 py-6 text-center text-[13px] text-navy-400">
                  Aucune action enregistrée.
                </p>
              ) : (
                <ol className="divide-y divide-navy-50">
                  {history.map((entry) => (
                    <li key={entry.id} className="px-5 py-3">
                      <p className="text-[13px] text-navy-800">{entry.summary}</p>
                      <p className="mt-0.5 text-[11.5px] text-navy-400">
                        {entry.userLabel} · {formatDateTime(entry.createdAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-2 text-[12px] text-navy-400">
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd className="mt-1 text-[13.5px] font-medium text-navy-900">{children}</dd>
    </div>
  );
}

function Line({
  label,
  value,
  tone,
  muted,
}: {
  label: string;
  value: string;
  tone?: "success";
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-navy-500">{label}</dt>
      <dd
        className={
          tone === "success"
            ? "font-medium tabular-nums text-[var(--color-success)]"
            : muted
              ? "tabular-nums text-navy-400"
              : "font-medium tabular-nums text-navy-900"
        }
      >
        {value}
      </dd>
    </div>
  );
}
