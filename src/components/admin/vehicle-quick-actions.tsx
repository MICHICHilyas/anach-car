"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Gauge, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { VEHICLE_STATUS } from "@/lib/labels";
import {
  archiveVehicle,
  deleteVehicle,
  restoreVehicle,
  setVehicleStatus,
  updateMileage,
} from "@/server/actions/vehicles";
import type { VehicleStatus } from "@/generated/prisma/enums";

/** Actions rapides : statut, kilométrage, archivage, suppression. */
export function VehicleQuickActions({
  vehicleId,
  vehicleLabel,
  status,
  mileage,
  archived,
  hasHistory,
}: {
  vehicleId: string;
  vehicleLabel: string;
  status: VehicleStatus;
  mileage: number;
  archived: boolean;
  hasHistory: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mileageValue, setMileageValue] = useState(String(mileage));

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    message: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(message);
        router.refresh();
      } else {
        toast.error(result.error ?? "Action impossible.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Field label="Statut du véhicule" htmlFor="quick-status">
        <NativeSelect
          id="quick-status"
          value={status}
          disabled={archived || pending}
          onChange={(event) =>
            run(
              () => setVehicleStatus(vehicleId, event.target.value as VehicleStatus),
              "Statut mis à jour.",
            )
          }
        >
          {Object.entries(VEHICLE_STATUS).map(([value, entry]) => (
            <option key={value} value={value}>
              {entry.label}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label="Kilométrage actuel" htmlFor="quick-mileage">
        <div className="flex gap-2">
          <Input
            id="quick-mileage"
            type="number"
            min={0}
            value={mileageValue}
            onChange={(event) => setMileageValue(event.target.value)}
          />
          <Button
            variant="outline"
            disabled={pending || Number(mileageValue) === mileage}
            onClick={() =>
              run(
                () => updateMileage(vehicleId, Number(mileageValue)),
                "Kilométrage mis à jour.",
              )
            }
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Gauge className="size-4" />
            )}
          </Button>
        </div>
      </Field>

      <div className="space-y-2 border-t border-navy-100 pt-4">
        {archived ? (
          <Button
            variant="outline"
            className="w-full"
            disabled={pending}
            onClick={() =>
              run(() => restoreVehicle(vehicleId), "Véhicule remis en service.")
            }
          >
            <ArchiveRestore className="size-4" />
            Remettre en service
          </Button>
        ) : (
          <ConfirmDialog
            tone="primary"
            trigger={
              <Button variant="outline" className="w-full">
                <Archive className="size-4" />
                Archiver le véhicule
              </Button>
            }
            title={`Archiver ${vehicleLabel} ?`}
            description="Le véhicule disparaît du site public et ne peut plus être réservé. Tout son historique (locations, entretiens, paiements) est conservé et il pourra être remis en service à tout moment."
            confirmLabel="Archiver"
            onConfirm={async () => {
              const result = await archiveVehicle(vehicleId);
              if (result.ok) {
                toast.success("Véhicule archivé.");
                router.refresh();
              } else toast.error(result.error);
            }}
          />
        )}

        {hasHistory ? (
          <p className="text-[12px] leading-relaxed text-navy-400">
            Ce véhicule possède un historique : la suppression définitive est
            désactivée pour préserver la comptabilité. Utilisez l&apos;archivage.
          </p>
        ) : (
          <ConfirmDialog
            trigger={
              <Button variant="ghost" className="w-full text-[var(--color-danger)]">
                <Trash2 className="size-4" />
                Supprimer définitivement
              </Button>
            }
            title={`Supprimer ${vehicleLabel} ?`}
            description="Cette action est irréversible. Le véhicule et ses photos seront définitivement effacés."
            confirmLabel="Supprimer définitivement"
            onConfirm={async () => {
              const result = await deleteVehicle(vehicleId);
              if (result.ok) {
                toast.success("Véhicule supprimé.");
                router.push("/admin/vehicules");
              } else toast.error(result.error);
            }}
          />
        )}
      </div>
    </div>
  );
}
