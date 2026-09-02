import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { toFormValues } from "@/lib/vehicle-form-values";
import { getFleetSuggestions } from "@/server/queries/vehicles";

export const metadata = { title: "Modifier un véhicule" };

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [vehicle, fleetSuggestions] = await Promise.all([
    db.vehicle.findUnique({ where: { id } }),
    getFleetSuggestions(),
  ]);
  if (!vehicle) notFound();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Véhicules", href: "/admin/vehicules" },
          {
            label: `${vehicle.brand} ${vehicle.model}`,
            href: `/admin/vehicules/${id}`,
          },
          { label: "Modifier" },
        ]}
        title={`Modifier ${vehicle.brand} ${vehicle.model}`}
        description={`${vehicle.internalCode} · ${vehicle.plate}`}
      />
      <VehicleForm
        initialValues={toFormValues(vehicle)}
        mode="edit"
        fleetSuggestions={fleetSuggestions}
      />
    </>
  );
}
