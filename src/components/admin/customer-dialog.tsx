"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { createCustomer, updateCustomer } from "@/server/actions/customers";

export type CustomerFormValues = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  cin: string;
  licenseNumber: string;
  country: string;
  city: string;
  address: string;
  internalNotes: string;
};

const EMPTY: CustomerFormValues = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  cin: "",
  licenseNumber: "",
  country: "Maroc",
  city: "",
  address: "",
  internalNotes: "",
};

/** Création et modification d'une fiche client, dans une fenêtre modale. */
export function CustomerDialog({
  customerId,
  initialValues,
}: {
  customerId?: string;
  initialValues?: CustomerFormValues;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<CustomerFormValues>(initialValues ?? EMPTY);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(customerId);

  function set<K extends keyof CustomerFormValues>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateCustomer(customerId!, values)
        : await createCustomer(values);

      if (result.ok) {
        toast.success(isEdit ? "Fiche client mise à jour." : "Client créé.");
        setOpen(false);
        if (!isEdit && result.data) {
          router.push(`/admin/clients/${result.data.id}`);
        }
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={isEdit ? "outline" : "primary"}>
          {isEdit ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {isEdit ? "Modifier la fiche" : "Nouveau client"}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={isEdit ? "Modifier la fiche client" : "Nouveau client"}
        description="Ces informations servent à établir le contrat de location."
      >
        <div className="space-y-4">
          {error ? (
            <p
              role="alert"
              className="rounded-lg bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--color-danger)]"
            >
              {error}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" htmlFor="customer-first" required>
              <Input
                id="customer-first"
                value={values.firstName}
                onChange={(event) => set("firstName", event.target.value)}
              />
            </Field>
            <Field label="Nom" htmlFor="customer-last" required>
              <Input
                id="customer-last"
                value={values.lastName}
                onChange={(event) => set("lastName", event.target.value)}
              />
            </Field>
            <Field label="Téléphone" htmlFor="customer-phone" required>
              <Input
                id="customer-phone"
                type="tel"
                value={values.phone}
                onChange={(event) => set("phone", event.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="customer-email">
              <Input
                id="customer-email"
                type="email"
                value={values.email}
                onChange={(event) => set("email", event.target.value)}
              />
            </Field>
            <Field label="CIN / Passeport" htmlFor="customer-cin">
              <Input
                id="customer-cin"
                value={values.cin}
                onChange={(event) => set("cin", event.target.value)}
              />
            </Field>
            <Field label="N° de permis" htmlFor="customer-license">
              <Input
                id="customer-license"
                value={values.licenseNumber}
                onChange={(event) => set("licenseNumber", event.target.value)}
              />
            </Field>
            <Field label="Pays" htmlFor="customer-country">
              <Input
                id="customer-country"
                value={values.country}
                onChange={(event) => set("country", event.target.value)}
              />
            </Field>
            <Field label="Ville" htmlFor="customer-city">
              <Input
                id="customer-city"
                value={values.city}
                onChange={(event) => set("city", event.target.value)}
              />
            </Field>
          </div>

          <Field label="Adresse" htmlFor="customer-address">
            <Input
              id="customer-address"
              value={values.address}
              onChange={(event) => set("address", event.target.value)}
            />
          </Field>

          <Field label="Note interne" htmlFor="customer-notes">
            <Textarea
              id="customer-notes"
              rows={2}
              value={values.internalNotes}
              onChange={(event) => set("internalNotes", event.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEdit ? "Enregistrer" : "Créer le client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
