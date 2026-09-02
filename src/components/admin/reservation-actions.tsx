"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, KeyRound, Loader2, LogIn, X, XCircle } from "lucide-react";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FUEL_LEVEL } from "@/lib/labels";
import {
  cancelReservation,
  completeRental,
  confirmReservation,
  rejectReservation,
  startRental,
} from "@/server/actions/reservations";
import type { ReservationStatus } from "@/generated/prisma/enums";

type Props = {
  reservationId: string;
  reference: string;
  status: ReservationStatus;
  vehicleMileage: number;
  rental?: { startMileage: number } | null;
};

/**
 * Barre d'actions de la fiche réservation.
 *
 * Les boutons affichés dépendent strictement du statut : on ne propose jamais
 * une action impossible. Le serveur revérifie de toute façon la transition.
 */
export function ReservationActions(props: Props) {
  const { status } = props;

  return (
    <div className="flex flex-wrap gap-2.5">
      {status === "PENDING" ? (
        <>
          <ConfirmButton {...props} />
          <RejectDialog {...props} />
        </>
      ) : null}

      {status === "CONFIRMED" ? (
        <>
          <StartRentalDialog {...props} />
          <CancelDialog {...props} />
        </>
      ) : null}

      {status === "ACTIVE" ? <CompleteRentalDialog {...props} /> : null}
    </div>
  );
}

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (
    action: () => Promise<{ ok: boolean; error?: string }>,
    successMessage: string,
    onDone?: () => void,
  ) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(successMessage);
        onDone?.();
        router.refresh();
      } else {
        toast.error(result.error ?? "Une erreur est survenue.");
      }
    });

  return { pending, run };
}

function ConfirmButton({ reservationId, reference }: Props) {
  const { pending, run } = useAction();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        run(
          () => confirmReservation(reservationId),
          `Réservation ${reference} confirmée. Le client est prévenu par email.`,
        )
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      Confirmer la réservation
    </Button>
  );
}

function RejectDialog({ reservationId, reference }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { pending, run } = useAction();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <XCircle className="size-4" />
          Refuser
        </Button>
      </DialogTrigger>
      <DialogContent
        title={`Refuser la demande ${reference}`}
        description="Le client sera informé par email. La période est immédiatement libérée."
      >
        <Field
          label="Motif du refus"
          htmlFor="reject-reason"
          hint="Visible par le client dans l'email"
        >
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Véhicule immobilisé pour entretien sur la période demandée."
          />
        </Field>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              run(
                () => rejectReservation(reservationId, reason),
                "Demande refusée.",
                () => setOpen(false),
              )
            }
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirmer le refus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({ reservationId, reference }: Props) {
  const [reason, setReason] = useState("");
  const { run } = useAction();

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline">
          <X className="size-4" />
          Annuler la réservation
        </Button>
      }
      title={`Annuler la réservation ${reference} ?`}
      description={
        <>
          <p>
            Le véhicule sera de nouveau proposé à la location sur cette période.
            Cette action est enregistrée dans l&apos;historique.
          </p>
          <Textarea
            className="mt-3"
            placeholder="Motif de l'annulation (facultatif)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </>
      }
      confirmLabel="Annuler la réservation"
      cancelLabel="Revenir"
      onConfirm={() =>
        run(() => cancelReservation(reservationId, reason), "Réservation annulée.")
      }
    />
  );
}

function StartRentalDialog({ reservationId, vehicleMileage }: Props) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const [form, setForm] = useState({
    startMileage: String(vehicleMileage),
    startFuel: "FULL",
    conditionNotes: "",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <KeyRound className="size-4" />
          Remettre le véhicule
        </Button>
      </DialogTrigger>
      <DialogContent
        title="État des lieux de départ"
        description="La réservation passe en location en cours et le véhicule est marqué « en location »."
      >
        <div className="space-y-4">
          <Field label="Kilométrage au départ" htmlFor="start-mileage" required>
            <Input
              id="start-mileage"
              type="number"
              min={0}
              value={form.startMileage}
              onChange={(event) =>
                setForm({ ...form, startMileage: event.target.value })
              }
            />
          </Field>

          <Field label="Niveau de carburant" htmlFor="start-fuel">
            <NativeSelect
              id="start-fuel"
              value={form.startFuel}
              onChange={(event) => setForm({ ...form, startFuel: event.target.value })}
            >
              {Object.entries(FUEL_LEVEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="État du véhicule / remarques" htmlFor="start-notes">
            <Textarea
              id="start-notes"
              rows={3}
              value={form.conditionNotes}
              onChange={(event) =>
                setForm({ ...form, conditionNotes: event.target.value })
              }
              placeholder="Rayure portière avant droite, pneus neufs, plein effectué…"
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
              run(
                () => startRental({ reservationId, ...form }),
                "Location démarrée.",
                () => setOpen(false),
              )
            }
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Valider le départ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteRentalDialog({ reservationId, rental }: Props) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const [form, setForm] = useState({
    endMileage: String(rental?.startMileage ?? 0),
    endFuel: "FULL",
    extraFees: "0",
    extraFeesReason: "",
    damageNotes: "",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <LogIn className="size-4" />
          Enregistrer le retour
        </Button>
      </DialogTrigger>
      <DialogContent
        title="État des lieux de retour"
        description="Clôture la location, met à jour le kilométrage et libère le véhicule."
      >
        <div className="space-y-4">
          <Field
            label="Kilométrage au retour"
            htmlFor="end-mileage"
            required
            hint={`Départ : ${rental?.startMileage?.toLocaleString("fr-MA") ?? "—"} km`}
          >
            <Input
              id="end-mileage"
              type="number"
              min={rental?.startMileage ?? 0}
              value={form.endMileage}
              onChange={(event) => setForm({ ...form, endMileage: event.target.value })}
            />
          </Field>

          <Field label="Niveau de carburant" htmlFor="end-fuel">
            <NativeSelect
              id="end-fuel"
              value={form.endFuel}
              onChange={(event) => setForm({ ...form, endFuel: event.target.value })}
            >
              {Object.entries(FUEL_LEVEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Frais supplémentaires (DH)" htmlFor="extra-fees">
              <Input
                id="extra-fees"
                type="number"
                min={0}
                step="0.01"
                value={form.extraFees}
                onChange={(event) => setForm({ ...form, extraFees: event.target.value })}
              />
            </Field>
            <Field label="Motif des frais" htmlFor="extra-reason">
              <Input
                id="extra-reason"
                value={form.extraFeesReason}
                onChange={(event) =>
                  setForm({ ...form, extraFeesReason: event.target.value })
                }
                placeholder="Carburant manquant, retard…"
              />
            </Field>
          </div>

          <Field label="Dommages constatés" htmlFor="damage-notes">
            <Textarea
              id="damage-notes"
              rows={3}
              value={form.damageNotes}
              onChange={(event) => setForm({ ...form, damageNotes: event.target.value })}
              placeholder="Aucun dommage constaté."
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
              run(
                () => completeRental({ reservationId, ...form }),
                "Location clôturée.",
                () => setOpen(false),
              )
            }
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Valider le retour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
