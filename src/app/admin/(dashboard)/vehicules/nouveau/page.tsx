import { ImagePlus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { EMPTY_VEHICLE } from "@/lib/vehicle-form-values";
import { getFleetSuggestions } from "@/server/queries/vehicles";

export const metadata = { title: "Ajouter un véhicule" };

export default async function NewVehiclePage() {
  const fleetSuggestions = await getFleetSuggestions();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Véhicules", href: "/admin/vehicules" },
          { label: "Nouveau" },
        ]}
        title="Ajouter un véhicule"
        description="Renseignez la fiche, puis ajoutez les photos à l'étape suivante."
      />

      {/*
        Une photo doit être rattachée à un véhicule qui existe déjà en base :
        le téléversement vient donc après l'enregistrement. On l'annonce ici,
        sinon l'utilisateur cherche un champ « photo » qui n'existe pas.
      */}
      <div className="mb-5 flex items-start gap-3 rounded-[var(--radius-card)] border border-teal-200 bg-teal-50/60 px-5 py-4">
        <ImagePlus className="mt-0.5 size-4.5 shrink-0 text-teal-700" />
        <div>
          <p className="text-[13.5px] font-semibold text-teal-900">
            Les photos s&apos;ajoutent juste après
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-teal-900/80">
            Enregistrez d&apos;abord la fiche. Vous arriverez directement sur la
            page du véhicule, où vous pourrez glisser vos photos. Elles
            alimentent la carte du catalogue, la fiche publique et le grand
            visuel de la page d&apos;accueil.
          </p>
        </div>
      </div>

      <VehicleForm
        initialValues={EMPTY_VEHICLE}
        mode="create"
        fleetSuggestions={fleetSuggestions}
      />
    </>
  );
}
