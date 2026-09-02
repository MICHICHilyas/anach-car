"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
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
import { PAYMENT_METHOD, PAYMENT_TYPE } from "@/lib/labels";
import { recordPayment } from "@/server/actions/payments";
import { toLocalDateInput } from "@/lib/search-params";

/** Saisie d'un encaissement : acompte, solde, frais ou remboursement. */
export function PaymentForm({
  reservationId,
  suggestedAmount,
}: {
  reservationId: string;
  suggestedAmount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(() => ({
    amount: suggestedAmount ? String(suggestedAmount / 100) : "",
    type: "BALANCE",
    method: "CASH",
    reference: "",
    note: "",
    paidAt: toLocalDateInput(new Date()),
  }));

  function submit() {
    startTransition(async () => {
      const result = await recordPayment({ reservationId, ...form });
      if (result.ok) {
        toast.success("Paiement enregistré.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" />
          Enregistrer un paiement
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Enregistrer un paiement"
        description="Le statut de paiement du dossier est recalculé automatiquement."
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Montant (DH)" htmlFor="payment-amount" required>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min={0}
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                autoFocus
              />
            </Field>
            <Field label="Date" htmlFor="payment-date">
              <Input
                id="payment-date"
                type="date"
                value={form.paidAt}
                onChange={(event) => setForm({ ...form, paidAt: event.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nature" htmlFor="payment-type">
              <NativeSelect
                id="payment-type"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                {Object.entries(PAYMENT_TYPE).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Moyen de paiement" htmlFor="payment-method">
              <NativeSelect
                id="payment-method"
                value={form.method}
                onChange={(event) => setForm({ ...form, method: event.target.value })}
              >
                {Object.entries(PAYMENT_METHOD).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <Field
            label="Référence"
            htmlFor="payment-reference"
            hint="N° de chèque, de transaction…"
          >
            <Input
              id="payment-reference"
              value={form.reference}
              onChange={(event) => setForm({ ...form, reference: event.target.value })}
            />
          </Field>

          <Field label="Note interne" htmlFor="payment-note">
            <Textarea
              id="payment-note"
              rows={2}
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
            />
          </Field>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button onClick={submit} disabled={pending || !form.amount}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
