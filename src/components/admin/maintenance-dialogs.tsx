"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MAINTENANCE_TYPE } from "@/lib/labels";
import {
  createMaintenance,
  createMaintenanceRecord,
} from "@/server/actions/maintenance";
import { toLocalDateInput } from "@/lib/search-params";

/** Enregistre un entretien réalisé (alimente l'historique du véhicule). */
export function AddMaintenanceRecordDialog({
  vehicleId,
  currentMileage,
  vehicles,
}: {
  vehicleId?: string;
  currentMileage?: number;
  vehicles?: { id: string; label: string; mileage: number }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  // Initialiseur paresseux : la date du jour est lue une seule fois, au
  // montage, et non à chaque rendu.
  const [form, setForm] = useState(() => ({
    vehicleId: vehicleId ?? vehicles?.[0]?.id ?? "",
    type: "OIL_CHANGE",
    performedAt: toLocalDateInput(new Date()),
    mileage: String(currentMileage ?? vehicles?.[0]?.mileage ?? 0),
    cost: "",
    garage: "",
    notes: "",
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" />
          Ajouter un entretien
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Enregistrer un entretien"
        description="Une vidange met automatiquement à jour la prochaine échéance du véhicule."
      >
        <div className="space-y-4">
          {vehicles ? (
            <Field label="Véhicule" htmlFor="record-vehicle" required>
              <NativeSelect
                id="record-vehicle"
                value={form.vehicleId}
                onChange={(event) => {
                  const selected = vehicles.find((v) => v.id === event.target.value);
                  setForm({
                    ...form,
                    vehicleId: event.target.value,
                    mileage: String(selected?.mileage ?? 0),
                  });
                }}
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type d'entretien" htmlFor="record-type" required>
              <NativeSelect
                id="record-type"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                {Object.entries(MAINTENANCE_TYPE).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Date" htmlFor="record-date" required>
              <Input
                id="record-date"
                type="date"
                value={form.performedAt}
                onChange={(event) =>
                  setForm({ ...form, performedAt: event.target.value })
                }
              />
            </Field>
            <Field label="Kilométrage" htmlFor="record-mileage">
              <Input
                id="record-mileage"
                type="number"
                min={0}
                value={form.mileage}
                onChange={(event) => setForm({ ...form, mileage: event.target.value })}
              />
            </Field>
            <Field label="Coût (DH)" htmlFor="record-cost">
              <Input
                id="record-cost"
                type="number"
                min={0}
                step="0.01"
                value={form.cost}
                onChange={(event) => setForm({ ...form, cost: event.target.value })}
              />
            </Field>
          </div>

          <Field label="Garage" htmlFor="record-garage">
            <Input
              id="record-garage"
              value={form.garage}
              onChange={(event) => setForm({ ...form, garage: event.target.value })}
              placeholder="Garage Souss Auto, Dcheira"
            />
          </Field>

          <Field label="Détail des travaux" htmlFor="record-notes">
            <Textarea
              id="record-notes"
              rows={2}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Vidange + filtre à huile + filtre à air"
            />
          </Field>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await createMaintenanceRecord({
                  ...form,
                  cost: form.cost || 0,
                });
                if (result.ok) {
                  toast.success("Entretien enregistré.");
                  setOpen(false);
                  router.refresh();
                } else toast.error(result.error);
              })
            }
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Planifie une immobilisation : le véhicule devient non réservable. */
export function ScheduleMaintenanceDialog({
  vehicleId,
  vehicles,
}: {
  vehicleId?: string;
  vehicles?: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(() => ({
    vehicleId: vehicleId ?? vehicles?.[0]?.id ?? "",
    type: "REVISION",
    startDate: toLocalDateInput(new Date()),
    endDate: toLocalDateInput(new Date(Date.now() + 86400000)),
    description: "",
    garage: "",
    estimatedCost: "",
    blocksAvailability: true,
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Wrench className="size-4" />
          Planifier une immobilisation
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Planifier une immobilisation"
        description="Le véhicule ne sera pas proposé à la location sur cette période."
      >
        <div className="space-y-4">
          {vehicles ? (
            <Field label="Véhicule" htmlFor="maint-vehicle" required>
              <NativeSelect
                id="maint-vehicle"
                value={form.vehicleId}
                onChange={(event) =>
                  setForm({ ...form, vehicleId: event.target.value })
                }
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="maint-type">
              <NativeSelect
                id="maint-type"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                {Object.entries(MAINTENANCE_TYPE).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Coût estimé (DH)" htmlFor="maint-cost">
              <Input
                id="maint-cost"
                type="number"
                min={0}
                step="0.01"
                value={form.estimatedCost}
                onChange={(event) =>
                  setForm({ ...form, estimatedCost: event.target.value })
                }
              />
            </Field>
            <Field label="Du" htmlFor="maint-start" required>
              <Input
                id="maint-start"
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm({ ...form, startDate: event.target.value })
                }
              />
            </Field>
            <Field label="Au" htmlFor="maint-end" required>
              <Input
                id="maint-end"
                type="date"
                min={form.startDate}
                value={form.endDate}
                onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              />
            </Field>
          </div>

          <Field label="Garage" htmlFor="maint-garage">
            <Input
              id="maint-garage"
              value={form.garage}
              onChange={(event) => setForm({ ...form, garage: event.target.value })}
            />
          </Field>

          <Field label="Travaux prévus" htmlFor="maint-description">
            <Textarea
              id="maint-description"
              rows={2}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-navy-700">
            <Checkbox
              checked={form.blocksAvailability}
              onChange={(event) =>
                setForm({ ...form, blocksAvailability: event.target.checked })
              }
            />
            Rendre le véhicule indisponible sur cette période
          </label>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await createMaintenance({
                  ...form,
                  estimatedCost: form.estimatedCost || undefined,
                });
                if (result.ok) {
                  toast.success("Immobilisation planifiée.");
                  setOpen(false);
                  router.refresh();
                } else toast.error(result.error);
              })
            }
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Planifier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
