import Link from "next/link";
import { Droplets, ShieldAlert, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDateShort, addDays } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { MAINTENANCE_STATUS, MAINTENANCE_TYPE } from "@/lib/labels";
import { PageHeader } from "@/components/admin/page-header";
import {
  AddMaintenanceRecordDialog,
  ScheduleMaintenanceDialog,
} from "@/components/admin/maintenance-dialogs";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const metadata = { title: "Maintenance" };

export default async function MaintenancePage() {
  const settings = await getSettings();
  const now = new Date();
  const insuranceLimit = addDays(now, settings.maintenance.insuranceAlertDays);
  const inspectionLimit = addDays(now, settings.maintenance.inspectionAlertDays);

  const [vehicles, maintenances, records] = await Promise.all([
    db.vehicle.findMany({
      where: { archivedAt: null },
      orderBy: [{ brand: "asc" }, { model: "asc" }],
      select: {
        id: true,
        brand: true,
        model: true,
        plate: true,
        mileage: true,
        oilChangeIntervalKm: true,
        nextOilChangeMileage: true,
        lastOilChangeDate: true,
        insuranceExpiry: true,
        technicalInspectionExpiry: true,
      },
    }),
    db.maintenance.findMany({
      where: { status: { in: ["PLANNED", "IN_PROGRESS"] } },
      orderBy: { startAt: "asc" },
      include: { vehicle: { select: { id: true, brand: true, model: true, plate: true } } },
    }),
    db.maintenanceRecord.findMany({
      orderBy: { performedAt: "desc" },
      take: 25,
      include: { vehicle: { select: { id: true, brand: true, model: true } } },
    }),
  ]);

  const vehicleOptions = vehicles.map((vehicle) => ({
    id: vehicle.id,
    label: `${vehicle.brand} ${vehicle.model} — ${vehicle.plate}`,
    mileage: vehicle.mileage,
  }));

  const oilAlerts = vehicles
    .filter((vehicle) => vehicle.nextOilChangeMileage != null)
    .map((vehicle) => ({
      ...vehicle,
      remaining: vehicle.nextOilChangeMileage! - vehicle.mileage,
    }))
    .filter((vehicle) => vehicle.remaining <= settings.maintenance.oilChangeAlertKm)
    .sort((a, b) => a.remaining - b.remaining);

  const documentAlerts = vehicles.filter(
    (vehicle) =>
      (vehicle.insuranceExpiry && vehicle.insuranceExpiry <= insuranceLimit) ||
      (vehicle.technicalInspectionExpiry &&
        vehicle.technicalInspectionExpiry <= inspectionLimit),
  );

  const totalCost = records.reduce((sum, record) => sum + record.cost, 0);

  return (
    <>
      <PageHeader
        title="Maintenance"
        description={`Seuil d'alerte vidange : ${settings.maintenance.oilChangeAlertKm.toLocaleString("fr-MA")} km avant échéance (modifiable dans les paramètres)`}
        actions={
          <>
            <AddMaintenanceRecordDialog vehicles={vehicleOptions} />
            <ScheduleMaintenanceDialog vehicles={vehicleOptions} />
          </>
        }
      />

      <div className="space-y-5">
        {/* --------------------- Alertes vidange --------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="size-4 text-navy-300" />
              Vidanges à surveiller
            </CardTitle>
            <span className="text-[12.5px] text-navy-400">
              {oilAlerts.length} véhicule(s)
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {oilAlerts.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-navy-400">
                Toutes les vidanges sont à jour.
              </p>
            ) : (
              <ul className="divide-y divide-navy-50">
                {oilAlerts.map((vehicle) => (
                  <li
                    key={vehicle.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3.5"
                  >
                    <Link
                      href={`/admin/vehicules/${vehicle.id}`}
                      className="text-[13.5px] font-medium text-navy-900 hover:text-teal-700"
                    >
                      {vehicle.brand} {vehicle.model}
                    </Link>
                    <span className="font-mono text-[11.5px] text-navy-400">
                      {vehicle.plate}
                    </span>
                    <span className="text-[12.5px] text-navy-500">
                      {vehicle.mileage.toLocaleString("fr-MA")} km /{" "}
                      {vehicle.nextOilChangeMileage!.toLocaleString("fr-MA")} km
                    </span>
                    <span className="ms-auto">
                      {vehicle.remaining <= 0 ? (
                        <Badge tone="danger" dot>
                          Dépassée de {Math.abs(vehicle.remaining).toLocaleString("fr-MA")} km
                        </Badge>
                      ) : (
                        <Badge tone="warning" dot>
                          Dans {vehicle.remaining.toLocaleString("fr-MA")} km
                        </Badge>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* --------------------- Assurances / VT --------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-navy-300" />
              Assurances et visites techniques
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {documentAlerts.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-navy-400">
                Aucune échéance proche.
              </p>
            ) : (
              <ul className="divide-y divide-navy-50">
                {documentAlerts.map((vehicle) => (
                  <li
                    key={vehicle.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3.5"
                  >
                    <Link
                      href={`/admin/vehicules/${vehicle.id}`}
                      className="text-[13.5px] font-medium text-navy-900 hover:text-teal-700"
                    >
                      {vehicle.brand} {vehicle.model}
                    </Link>
                    <span className="ms-auto flex flex-wrap gap-2">
                      {vehicle.insuranceExpiry &&
                      vehicle.insuranceExpiry <= insuranceLimit ? (
                        <Badge
                          tone={vehicle.insuranceExpiry <= now ? "danger" : "warning"}
                        >
                          Assurance · {formatDateShort(vehicle.insuranceExpiry)}
                        </Badge>
                      ) : null}
                      {vehicle.technicalInspectionExpiry &&
                      vehicle.technicalInspectionExpiry <= inspectionLimit ? (
                        <Badge
                          tone={
                            vehicle.technicalInspectionExpiry <= now
                              ? "danger"
                              : "warning"
                          }
                        >
                          Visite technique ·{" "}
                          {formatDateShort(vehicle.technicalInspectionExpiry)}
                        </Badge>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* --------------------- Immobilisations --------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-4 text-navy-300" />
              Immobilisations planifiées
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {maintenances.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-navy-400">
                Aucune immobilisation planifiée.
              </p>
            ) : (
              <ul className="divide-y divide-navy-50">
                {maintenances.map((maintenance) => (
                  <li
                    key={maintenance.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3.5"
                  >
                    <Link
                      href={`/admin/vehicules/${maintenance.vehicle.id}`}
                      className="text-[13.5px] font-medium text-navy-900 hover:text-teal-700"
                    >
                      {maintenance.vehicle.brand} {maintenance.vehicle.model}
                    </Link>
                    <Badge tone="outline">{MAINTENANCE_TYPE[maintenance.type]}</Badge>
                    <span className="text-[12.5px] text-navy-500">
                      {formatDateShort(maintenance.startAt)} →{" "}
                      {formatDateShort(maintenance.endAt)}
                    </span>
                    {maintenance.garage ? (
                      <span className="text-[12.5px] text-navy-400">
                        {maintenance.garage}
                      </span>
                    ) : null}
                    <span className="ms-auto">
                      <StatusBadge status={MAINTENANCE_STATUS[maintenance.status]} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* --------------------- Historique global --------------------- */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-navy-900">
              Derniers entretiens réalisés
            </h2>
            <span className="text-[12.5px] text-navy-400">
              {formatMoney(totalCost)} sur les {records.length} dernières lignes
            </span>
          </div>

          {records.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Aucun entretien enregistré"
              description="Enregistrez vidanges, pneus et réparations pour suivre le coût réel de votre flotte."
            />
          ) : (
            <TableWrapper>
              <Table>
                <Thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Véhicule</Th>
                    <Th>Type</Th>
                    <Th className="text-end">Kilométrage</Th>
                    <Th>Garage</Th>
                    <Th className="text-end">Coût</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {records.map((record) => (
                    <Tr key={record.id}>
                      <Td className="whitespace-nowrap text-[12.5px]">
                        {formatDateShort(record.performedAt)}
                      </Td>
                      <Td>
                        <Link
                          href={`/admin/vehicules/${record.vehicle.id}`}
                          className="font-medium text-navy-900 hover:text-teal-700"
                        >
                          {record.vehicle.brand} {record.vehicle.model}
                        </Link>
                      </Td>
                      <Td>
                        <Badge tone="outline">{MAINTENANCE_TYPE[record.type]}</Badge>
                      </Td>
                      <Td className="text-end tabular-nums">
                        {record.mileage?.toLocaleString("fr-MA") ?? "—"} km
                      </Td>
                      <Td className="text-[12.5px] text-navy-500">
                        {record.garage ?? "—"}
                      </Td>
                      <Td className="text-end font-semibold tabular-nums">
                        {formatMoney(record.cost)}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableWrapper>
          )}
        </div>
      </div>
    </>
  );
}
