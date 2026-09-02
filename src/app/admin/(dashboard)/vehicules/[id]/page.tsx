import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Droplets,
  ExternalLink,
  Eye,
  Gauge,
  Pencil,
  FileText,
  ImagePlus,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDateShort, addDays } from "@/lib/dates";
import {
  DOCUMENT_TYPE,
  FUEL,
  MAINTENANCE_STATUS,
  MAINTENANCE_TYPE,
  RESERVATION_STATUS,
  TRANSMISSION,
  VEHICLE_CATEGORY,
  VEHICLE_STATUS,
} from "@/lib/labels";
import { PageHeader } from "@/components/admin/page-header";
import { VehicleImages } from "@/components/admin/vehicle-images";
import { VehicleQuickActions } from "@/components/admin/vehicle-quick-actions";
import {
  AddMaintenanceRecordDialog,
  ScheduleMaintenanceDialog,
} from "@/components/admin/maintenance-dialogs";
import { DocumentUpload } from "@/components/admin/document-upload";
import { DocumentActions } from "@/components/admin/document-actions";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehicle = await db.vehicle.findUnique({
    where: { id },
    select: { brand: true, model: true },
  });
  return { title: vehicle ? `${vehicle.brand} ${vehicle.model}` : "Véhicule" };
}

export default async function VehicleDetailAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const justCreated = query.nouveau === "1";

  const [vehicle, settings] = await Promise.all([
    db.vehicle.findUnique({
      where: { id },
      include: {
        images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
        maintenanceRecords: { orderBy: { performedAt: "desc" }, take: 20 },
        maintenances: { orderBy: { startAt: "desc" }, take: 10 },
        documents: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            title: true,
            fileName: true,
            expiresAt: true,
          },
        },
        reservations: {
          where: { endAt: { gte: new Date() } },
          orderBy: { startAt: "asc" },
          take: 10,
          select: {
            id: true,
            reference: true,
            startAt: true,
            endAt: true,
            status: true,
            customer: { select: { firstName: true, lastName: true } },
          },
        },
        _count: { select: { reservations: true, rentals: true } },
      },
    }),
    getSettings(),
  ]);

  if (!vehicle) notFound();

  const label = `${vehicle.brand} ${vehicle.model}`;
  const remainingKm =
    vehicle.nextOilChangeMileage != null
      ? vehicle.nextOilChangeMileage - vehicle.mileage
      : null;
  const alertDate = addDays(new Date(), settings.maintenance.insuranceAlertDays);
  const totalMaintenanceCost = vehicle.maintenanceRecords.reduce(
    (sum, record) => sum + record.cost,
    0,
  );

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Véhicules", href: "/admin/vehicules" },
          { label },
        ]}
        title={label}
        description={`${vehicle.internalCode} · ${vehicle.plate} · ${vehicle.year} · ${VEHICLE_CATEGORY[vehicle.category]}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/fr/vehicules/${vehicle.slug}`} target="_blank">
                <Eye className="size-4" />
                Voir sur le site
                <ExternalLink className="size-3" />
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/admin/vehicules/${id}/modifier`}>
                <Pencil className="size-4" />
                Modifier
              </Link>
            </Button>
          </>
        }
      />

      {justCreated ? (
        <div className="mb-5 flex items-start gap-3 rounded-[var(--radius-card)] border border-teal-200 bg-teal-50/70 px-5 py-4">
          <ImagePlus className="mt-0.5 size-4.5 shrink-0 text-teal-700" />
          <div>
            <p className="text-[13.5px] font-semibold text-teal-900">
              Véhicule ajouté à la flotte
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-teal-900/80">
              Glissez maintenant ses photos dans l&apos;encadré ci-dessous. Sans
              photo, le véhicule s&apos;affiche avec une illustration générique
              sur le site.
            </p>
          </div>
        </div>
      ) : null}

      {vehicle.archivedAt ? (
        <div className="mb-5 rounded-[var(--radius-card)] border border-navy-200 bg-navy-100/60 px-5 py-3.5">
          <p className="text-[13.5px] font-medium text-navy-700">
            Ce véhicule est archivé depuis le {formatDateShort(vehicle.archivedAt)}.
            Il n&apos;apparaît plus sur le site et ne peut plus être réservé.
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {/* ------------------------ Photos ------------------------ */}
          <Card
            id="photos"
            className={cn(
              "scroll-mt-24",
              // Mise en évidence au retour du formulaire de création.
              justCreated && "ring-2 ring-teal-400 ring-offset-2",
            )}
          >
            <CardHeader>
              <CardTitle>Photos</CardTitle>
              <span className="text-[12.5px] text-navy-400">
                {vehicle.images.length} photo{vehicle.images.length > 1 ? "s" : ""}
              </span>
            </CardHeader>
            <CardContent>
              <VehicleImages vehicleId={vehicle.id} images={vehicle.images} />
            </CardContent>
          </Card>

          {/* ------------------ Suivi de la vidange ------------------ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="size-4 text-navy-300" />
                Suivi de la vidange
              </CardTitle>
              <AddMaintenanceRecordDialog
                vehicleId={vehicle.id}
                currentMileage={vehicle.mileage}
              />
            </CardHeader>
            <CardContent>
              {vehicle.nextOilChangeMileage == null ? (
                <p className="text-[13px] text-navy-400">
                  Aucune vidange enregistrée. Renseignez le kilométrage de la
                  dernière vidange dans la fiche du véhicule pour activer les
                  alertes automatiques.
                </p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Metric
                      label="Kilométrage actuel"
                      value={`${vehicle.mileage.toLocaleString("fr-MA")} km`}
                    />
                    <Metric
                      label="Prochaine vidange"
                      value={`${vehicle.nextOilChangeMileage.toLocaleString("fr-MA")} km`}
                    />
                    <Metric
                      label="Restant"
                      value={
                        remainingKm! <= 0
                          ? `${Math.abs(remainingKm!).toLocaleString("fr-MA")} km de retard`
                          : `${remainingKm!.toLocaleString("fr-MA")} km`
                      }
                      tone={
                        remainingKm! <= 0
                          ? "danger"
                          : remainingKm! <= settings.maintenance.oilChangeAlertKm
                            ? "warning"
                            : "success"
                      }
                    />
                  </div>

                  {/* Jauge de progression jusqu'à la prochaine vidange */}
                  <div className="mt-5">
                    <div className="h-2 overflow-hidden rounded-full bg-navy-100">
                      <div
                        className={
                          remainingKm! <= 0
                            ? "h-full bg-[var(--color-danger)]"
                            : remainingKm! <= settings.maintenance.oilChangeAlertKm
                              ? "h-full bg-[var(--color-warning)]"
                              : "h-full bg-teal-500"
                        }
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              2,
                              ((vehicle.oilChangeIntervalKm - Math.max(0, remainingKm!)) /
                                vehicle.oilChangeIntervalKm) *
                                100,
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-[12px] text-navy-400">
                      Intervalle : {vehicle.oilChangeIntervalKm.toLocaleString("fr-MA")} km
                      {vehicle.lastOilChangeDate
                        ? ` · dernière vidange le ${formatDateShort(vehicle.lastOilChangeDate)}`
                        : ""}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ------------------ Historique d'entretien ------------------ */}
          <Card>
            <CardHeader>
              <CardTitle>Historique d&apos;entretien</CardTitle>
              <span className="text-[12.5px] text-navy-400">
                {formatMoney(totalMaintenanceCost)} au total
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {vehicle.maintenanceRecords.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-navy-400">
                  Aucun entretien enregistré pour ce véhicule.
                </p>
              ) : (
                <ul className="divide-y divide-navy-50">
                  {vehicle.maintenanceRecords.map((record) => (
                    <li
                      key={record.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5"
                    >
                      <span className="w-20 shrink-0 text-[12.5px] text-navy-400">
                        {formatDateShort(record.performedAt)}
                      </span>
                      <Badge tone="outline">{MAINTENANCE_TYPE[record.type]}</Badge>
                      <span className="text-[13px] text-navy-600">
                        {record.mileage?.toLocaleString("fr-MA")} km
                      </span>
                      {record.notes ? (
                        <span className="text-[12.5px] text-navy-400">
                          {record.notes}
                        </span>
                      ) : null}
                      <span className="ms-auto text-[13px] font-semibold tabular-nums text-navy-900">
                        {formatMoney(record.cost)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* ------------------ Immobilisations ------------------ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="size-4 text-navy-300" />
                Immobilisations
              </CardTitle>
              <ScheduleMaintenanceDialog vehicleId={vehicle.id} />
            </CardHeader>
            <CardContent className="p-0">
              {vehicle.maintenances.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-navy-400">
                  Aucune immobilisation planifiée.
                </p>
              ) : (
                <ul className="divide-y divide-navy-50">
                  {vehicle.maintenances.map((maintenance) => (
                    <li
                      key={maintenance.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5"
                    >
                      <span className="text-[12.5px] text-navy-500">
                        {formatDateShort(maintenance.startAt)} →{" "}
                        {formatDateShort(maintenance.endAt)}
                      </span>
                      <Badge tone="outline">
                        {MAINTENANCE_TYPE[maintenance.type]}
                      </Badge>
                      {maintenance.description ? (
                        <span className="text-[12.5px] text-navy-400">
                          {maintenance.description}
                        </span>
                      ) : null}
                      <span className="ms-auto">
                        <StatusBadge
                          status={MAINTENANCE_STATUS[maintenance.status]}
                        />
                      </span>
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
              <CardTitle>Actions rapides</CardTitle>
              <StatusBadge status={VEHICLE_STATUS[vehicle.status]} />
            </CardHeader>
            <CardContent>
              <VehicleQuickActions
                vehicleId={vehicle.id}
                vehicleLabel={label}
                status={vehicle.status}
                mileage={vehicle.mileage}
                archived={Boolean(vehicle.archivedAt)}
                hasHistory={
                  vehicle._count.reservations > 0 || vehicle._count.rentals > 0
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fiche technique</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-[13px]">
                <Row label="Transmission" value={TRANSMISSION[vehicle.transmission]} />
                <Row label="Carburant" value={FUEL[vehicle.fuel]} />
                <Row label="Places / portes" value={`${vehicle.seats} / ${vehicle.doors}`} />
                <Row
                  label="Climatisation"
                  value={vehicle.hasAirConditioning ? "Oui" : "Non"}
                />
                <Row
                  label="Kilométrage"
                  value={`${vehicle.mileage.toLocaleString("fr-MA")} km`}
                />
                {vehicle.color ? <Row label="Couleur" value={vehicle.color} /> : null}
                {vehicle.purchaseDate ? (
                  <Row
                    label="Date d'achat"
                    value={formatDateShort(vehicle.purchaseDate)}
                  />
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tarifs</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-[13px]">
                <Row label="Journalier" value={formatMoney(vehicle.dailyRate)} />
                {vehicle.rate3Days ? (
                  <Row label="3 jours et +" value={formatMoney(vehicle.rate3Days)} />
                ) : null}
                {vehicle.weeklyRate ? (
                  <Row label="Semaine" value={formatMoney(vehicle.weeklyRate)} />
                ) : null}
                {vehicle.monthlyRate ? (
                  <Row label="Mois" value={formatMoney(vehicle.monthlyRate)} />
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-navy-300" />
                Documents administratifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-navy-500">Assurance</dt>
                  <dd>
                    {vehicle.insuranceExpiry ? (
                      <Badge
                        tone={
                          vehicle.insuranceExpiry <= new Date()
                            ? "danger"
                            : vehicle.insuranceExpiry <= alertDate
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {formatDateShort(vehicle.insuranceExpiry)}
                      </Badge>
                    ) : (
                      <span className="text-navy-300">Non renseignée</span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-navy-500">Visite technique</dt>
                  <dd>
                    {vehicle.technicalInspectionExpiry ? (
                      <Badge
                        tone={
                          vehicle.technicalInspectionExpiry <= new Date()
                            ? "danger"
                            : vehicle.technicalInspectionExpiry <= alertDate
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {formatDateShort(vehicle.technicalInspectionExpiry)}
                      </Badge>
                    ) : (
                      <span className="text-navy-300">Non renseignée</span>
                    )}
                  </dd>
                </div>
                {vehicle.insuranceProvider ? (
                  <Row label="Compagnie" value={vehicle.insuranceProvider} />
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4 text-navy-300" />
                Documents du véhicule
              </CardTitle>
              <DocumentUpload vehicleId={vehicle.id} />
            </CardHeader>
            <CardContent className="p-0">
              {vehicle.documents.length === 0 ? (
                <p className="px-5 py-6 text-center text-[13px] text-navy-400">
                  Carte grise, attestation d&apos;assurance, procès-verbal de
                  visite technique…
                </p>
              ) : (
                <ul className="divide-y divide-navy-50">
                  {vehicle.documents.map((document) => (
                    <li
                      key={document.id}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <FileText className="size-4 shrink-0 text-navy-300" />
                      <a
                        href={`/api/admin/documents/${document.id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 flex-1 truncate text-[13px] text-navy-700 hover:text-teal-700"
                      >
                        {document.title ?? document.fileName}
                      </a>
                      <span className="shrink-0 text-[11.5px] text-navy-400">
                        {DOCUMENT_TYPE[document.type]}
                      </span>
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
                <CalendarDays className="size-4 text-navy-300" />
                Réservations à venir
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {vehicle.reservations.length === 0 ? (
                <p className="px-5 py-6 text-center text-[13px] text-navy-400">
                  Aucune réservation à venir.
                </p>
              ) : (
                <ul className="divide-y divide-navy-50">
                  {vehicle.reservations.map((reservation) => (
                    <li key={reservation.id}>
                      <Link
                        href={`/admin/reservations/${reservation.id}`}
                        className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-navy-50/60"
                      >
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium text-navy-900">
                            {formatDateShort(reservation.startAt)} →{" "}
                            {formatDateShort(reservation.endAt)}
                          </span>
                          <span className="block text-[12px] text-navy-400">
                            {reservation.customer.firstName}{" "}
                            {reservation.customer.lastName}
                          </span>
                        </span>
                        <StatusBadge
                          status={RESERVATION_STATUS[reservation.status]}
                          dot={false}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {vehicle.internalNotes ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes internes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-navy-600">
                  {vehicle.internalNotes}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-navy-500">{label}</dt>
      <dd className="font-medium text-navy-900">{value}</dd>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger";
}) {
  const color =
    tone === "danger"
      ? "text-[var(--color-danger)]"
      : tone === "warning"
        ? "text-[var(--color-warning)]"
        : tone === "success"
          ? "text-[var(--color-success)]"
          : "text-navy-950";
  return (
    <div className="rounded-xl bg-navy-50/70 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11.5px] text-navy-400">
        <Gauge className="size-3.5" />
        {label}
      </p>
      <p className={`mt-1 text-[15px] font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
