"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { DOCUMENT_TYPE } from "@/lib/labels";
import { uploadDocument } from "@/server/actions/documents";

/**
 * Dépôt d'un document sensible.
 * Le fichier part directement vers une server action : il ne transite jamais
 * par le dossier public.
 */
export function DocumentUpload({
  customerId,
  vehicleId,
  reservationId,
}: {
  customerId?: string;
  vehicleId?: string;
  reservationId?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="size-4" />
          Ajouter un document
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Ajouter un document"
        description="Accessible uniquement depuis l'espace agence, après connexion."
      >
        <form
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            if (customerId) formData.set("customerId", customerId);
            if (vehicleId) formData.set("vehicleId", vehicleId);
            if (reservationId) formData.set("reservationId", reservationId);

            startTransition(async () => {
              const result = await uploadDocument(formData);
              if (result.ok) {
                toast.success("Document ajouté.");
                setOpen(false);
                formRef.current?.reset();
                router.refresh();
              } else {
                toast.error(result.error);
              }
            });
          }}
          className="space-y-4"
        >
          <Field label="Type de document" htmlFor="document-type" required>
            <NativeSelect id="document-type" name="type" defaultValue="CIN">
              {Object.entries(DOCUMENT_TYPE).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Intitulé" htmlFor="document-title" hint="facultatif">
            <Input id="document-title" name="title" placeholder="CIN recto-verso" />
          </Field>

          <Field
            label="Date d'expiration"
            htmlFor="document-expires"
            hint="déclenche une alerte à l'approche"
          >
            <Input id="document-expires" name="expiresAt" type="date" />
          </Field>

          <Field label="Fichier" htmlFor="document-file" required>
            <Input
              id="document-file"
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
              required
              className="h-auto py-2.5 file:me-3 file:rounded-md file:border-0 file:bg-navy-100 file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium file:text-navy-700"
            />
          </Field>

          <p className="text-[12px] text-navy-400">
            JPG, PNG, WebP ou PDF · 10 Mo maximum.
          </p>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
