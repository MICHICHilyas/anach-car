import Link from "next/link";
import Image from "next/image";
import { Car, Droplets, Plus, ShieldAlert } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDateShort, addDays } from "@/lib/dates";
import { VEHICLE_CATEGORY, VEHICLE_STATUS } from "@/lib/labels";
import { PageHeader } from "@/components/admin/page-header";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { SearchInput } from "@/components/admin/search-input";
import { Badge, StatusBadge } from "@/components/ui/badge";
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

export const metadata = { title: "Véhicules" };

export default async function VehiclesAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const statusFilter = single("etat") ?? "";
  const q = single("q");
  const settings = await getSettings();

  const where = {
    ...(statusFilter === "ARCHIVED"
      ? { archivedAt: { not: null } }
      : { archivedAt: null }),
    ...(statusFilter && statusFilter !== "ARCHIVED"
      ? { status: statusFilter as never }
      : {}),
    ...(q
      ? {
          OR: [
            { brand: { contains: q, mode: "insensitive" as const } },
            { model: { contains: q, mode: "insensitive" as const } },
            { plate: { contains: q, mode: "insensitive" as const } },
            { internalCode: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [vehicles, counts, archivedCount] = await Promise.all([
    db.vehicle.findMany({
      where,
      orderBy: [{ status: "asc" }, { brand: "asc" }, { model: "asc" }],
      select: {
        id: true,
        internalCode: true,
        brand: true,
        model: true,
        year: true,
        plate: true,
        category: true,
        status: true,
        dailyRate: true,
        mileage: true,
        nextOilChangeMileage: true,
        insuranceExpiry: true,
        technicalInspectionExpiry: true,
        archivedAt: true,
        images: {
          select: { url: true },
          orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          take: 1,
        },
      },
    }),
    db.vehicle.groupBy({ by: ["status"], where: { archivedAt: null }, _count: true }),
    db.vehicle.count({ where: { archivedAt: { not: null } } }),
  ]);

  const countFor = (status: string) =>
    counts.find((row) => row.status === status)?._count ?? 0;
  const total = counts.reduce((sum, row) => sum + row._count, 0);
  const alertDate = addDays(new Date(), settings.maintenance.insuranceAlertDays);

  return (
    <>
      <PageHeader
        title="Véhicules"
        description={`${total} véhicule${total > 1 ? "s" : ""} en flotte${archivedCount ? ` · ${archivedCount} archivé(s)` : ""}`}
        actions={
          <Button asChild size="sm">
            <Link href="/admin/vehicules/nouveau">
              <Plus className="size-4" />
              Ajouter un véhicule
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
        <FilterTabs
          param="etat"
          options={[
            { value: "", label: "Tous", count: total },
            { value: "AVAILABLE", label: "Disponibles", count: countFor("AVAILABLE") },
            { value: "RENTED", label: "En location", count: countFor("RENTED") },
            { value: "MAINTENANCE", label: "Au garage", count: countFor("MAINTENANCE") },
            { value: "UNAVAILABLE", label: "Indisponibles", count: countFor("UNAVAILABLE") },
            { value: "ARCHIVED", label: "Archivés", count: archivedCount },
          ]}
        />

        <SearchInput placeholder="Marque, modèle, immatriculation…" />

        {vehicles.length === 0 ? (
          <EmptyState
            icon={Car}
            title="Aucun véhicule ne correspond"
            description="Ajoutez un véhicule à la flotte ou modifiez vos filtres."
            action={
              <Button asChild>
                <Link href="/admin/vehicules/nouveau">
                  <Plus className="size-4" />
                  Ajouter un véhicule
                </Link>
              </Button>
            }
          />
        ) : (
          <TableWrapper>
            <Table className="min-w-[900px]">
              <Thead>
                <tr>
                  <Th>Véhicule</Th>
                  <Th>Immatriculation</Th>
                  <Th>Catégorie</Th>
                  <Th className="whitespace-nowrap text-end">Tarif / jour</Th>
                  <Th className="whitespace-nowrap text-end">Kilométrage</Th>
                  <Th>Vidange</Th>
                  <Th>Échéances</Th>
                  <Th>Statut</Th>
                </tr>
              </Thead>
              <Tbody>
                {vehicles.map((vehicle) => {
                  const remaining =
                    vehicle.nextOilChangeMileage != null
                      ? vehicle.nextOilChangeMileage - vehicle.mileage
                      : null;
                  const insuranceSoon =
                    vehicle.insuranceExpiry && vehicle.insuranceExpiry <= alertDate;
                  const inspectionSoon =
                    vehicle.technicalInspectionExpiry &&
                    vehicle.technicalInspectionExpiry <= alertDate;

                  return (
                    <Tr key={vehicle.id}>
                      <Td>
                        <Link
                          href={`/admin/vehicules/${vehicle.id}`}
                          className="flex items-center gap-3"
                        >
                          <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-navy-50">
                            <Image
                              src={
                                vehicle.images[0]?.url ??
                                "/images/vehicle-placeholder.svg"
                              }
                              alt=""
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium text-navy-900 hover:text-teal-700">
                              {vehicle.brand} {vehicle.model}
                            </span>
                            <span className="block text-[11.5px] text-navy-400">
                              {vehicle.internalCode} · {vehicle.year}
                            </span>
                          </span>
                        </Link>
                      </Td>
                      <Td className="font-mono text-[12.5px]">{vehicle.plate}</Td>
                      <Td className="text-[13px]">
                        {VEHICLE_CATEGORY[vehicle.category]}
                      </Td>
                      <Td className="whitespace-nowrap text-end font-semibold tabular-nums">
                        {formatMoney(vehicle.dailyRate)}
                      </Td>
                      <Td className="whitespace-nowrap text-end tabular-nums">
                        {vehicle.mileage.toLocaleString("fr-MA")} km
                      </Td>
                      <Td>
                        {remaining == null ? (
                          <span className="text-[12.5px] text-navy-300">—</span>
                        ) : remaining <= 0 ? (
                          <Badge tone="danger" dot>
                            Dépassée
                          </Badge>
                        ) : remaining <= settings.maintenance.oilChangeAlertKm ? (
                          <Badge tone="warning" dot>
                            {remaining.toLocaleString("fr-MA")} km
                          </Badge>
                        ) : (
                          <span className="whitespace-nowrap text-[12.5px] text-navy-500">
                            dans {remaining.toLocaleString("fr-MA")} km
                          </span>
                        )}
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1.5">
                          {insuranceSoon ? (
                            <Badge tone="warning">
                              <ShieldAlert className="size-3" />
                              Assurance {formatDateShort(vehicle.insuranceExpiry!)}
                            </Badge>
                          ) : null}
                          {inspectionSoon ? (
                            <Badge tone="warning">
                              <Droplets className="size-3" />
                              VT {formatDateShort(vehicle.technicalInspectionExpiry!)}
                            </Badge>
                          ) : null}
                          {!insuranceSoon && !inspectionSoon ? (
                            <span className="text-[12.5px] text-navy-300">À jour</span>
                          ) : null}
                        </div>
                      </Td>
                      <Td>
                        {vehicle.archivedAt ? (
                          <Badge tone="neutral">Archivé</Badge>
                        ) : (
                          <StatusBadge status={VEHICLE_STATUS[vehicle.status]} />
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableWrapper>
        )}
      </div>
    </>
  );
}
