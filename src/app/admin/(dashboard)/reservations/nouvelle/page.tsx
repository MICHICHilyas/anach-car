import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { NewReservationForm } from "@/components/admin/new-reservation-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Car } from "lucide-react";

export const metadata = { title: "Nouvelle réservation" };

export default async function NewReservationPage() {
  const [vehicles, customers] = await Promise.all([
    db.vehicle.findMany({
      where: { archivedAt: null, status: { not: "UNAVAILABLE" } },
      orderBy: [{ brand: "asc" }, { model: "asc" }],
      select: {
        id: true,
        brand: true,
        model: true,
        plate: true,
        dailyRate: true,
        rate3Days: true,
        weeklyRate: true,
        monthlyRate: true,
      },
    }),
    db.customer.findMany({
      where: { archivedAt: null },
      orderBy: { lastName: "asc" },
      take: 200,
      select: { id: true, firstName: true, lastName: true, phone: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Réservations", href: "/admin/reservations" },
          { label: "Nouvelle" },
        ]}
        title="Nouvelle réservation"
        description="Pour une demande reçue au comptoir, par téléphone ou par WhatsApp."
      />

      {vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Aucun véhicule disponible"
          description="Ajoutez au moins un véhicule à la flotte pour créer une réservation."
        />
      ) : (
        <NewReservationForm
          vehicles={vehicles.map((vehicle) => ({
            id: vehicle.id,
            label: `${vehicle.brand} ${vehicle.model} (${vehicle.plate})`,
            dailyRate: vehicle.dailyRate,
            rate3Days: vehicle.rate3Days,
            weeklyRate: vehicle.weeklyRate,
            monthlyRate: vehicle.monthlyRate,
          }))}
          customers={customers.map((customer) => ({
            id: customer.id,
            label: `${customer.firstName} ${customer.lastName} — ${customer.phone}`,
          }))}
        />
      )}
    </>
  );
}
