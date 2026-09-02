"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2, Pencil, UserPlus, Wand2 } from "lucide-react";
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
import { USER_ROLE } from "@/lib/labels";
import { createUser, updateUser } from "@/server/actions/users";

export type UserFormValues = {
  name: string;
  email: string;
  role: string;
  phone: string;
};

const EMPTY: UserFormValues = { name: "", email: "", role: "EMPLOYEE", phone: "" };

/**
 * Création et modification d'un compte du personnel.
 *
 * Le mot de passe est choisi par l'administrateur, qui le communique de vive
 * voix à l'employé : l'agence n'a pas forcément de service d'envoi d'emails
 * configuré, et un lien d'invitation qui n'arrive jamais bloquerait la
 * création du compte.
 */
export function UserDialog({
  userId,
  initialValues,
}: {
  userId?: string;
  initialValues?: UserFormValues;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<UserFormValues>(initialValues ?? EMPTY);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isEdit = Boolean(userId);

  function set<K extends keyof UserFormValues>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  /** Mot de passe solide, sans caractères ambigus (0/O, 1/l). */
  function generate() {
    const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint32Array(14);
    crypto.getRandomValues(bytes);
    const generated = Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
    setPassword(generated);
  }

  function submit() {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = isEdit
        ? await updateUser(userId!, values)
        : await createUser({ ...values, password });

      if (result.ok) {
        toast.success(isEdit ? "Compte mis à jour." : "Compte créé.");
        setOpen(false);
        setPassword("");
        router.refresh();
        return;
      }
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <button
            type="button"
            className="rounded-md p-1.5 text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-800"
            aria-label="Modifier le compte"
          >
            <Pencil className="size-3.5" />
          </button>
        ) : (
          <Button size="sm">
            <UserPlus className="size-4" />
            Ajouter un compte
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        title={isEdit ? "Modifier le compte" : "Nouveau compte"}
        description="Chaque membre de l'équipe doit avoir son propre compte : le journal d'activité indique alors qui a fait quoi."
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

          <Field label="Nom complet" htmlFor="user-name" required error={fieldErrors.name}>
            <Input
              id="user-name"
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              autoComplete="off"
            />
          </Field>

          <Field
            label="Adresse email"
            htmlFor="user-email"
            required
            error={fieldErrors.email}
            hint="sert d'identifiant de connexion"
          >
            <Input
              id="user-email"
              type="email"
              value={values.email}
              onChange={(event) => set("email", event.target.value)}
              autoComplete="off"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rôle" htmlFor="user-role">
              <NativeSelect
                id="user-role"
                value={values.role}
                onChange={(event) => set("role", event.target.value)}
              >
                {Object.entries(USER_ROLE).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Téléphone" htmlFor="user-phone">
              <Input
                id="user-phone"
                value={values.phone}
                onChange={(event) => set("phone", event.target.value)}
              />
            </Field>
          </div>

          <p className="rounded-lg bg-navy-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-navy-600">
            <strong>Administrateur</strong> : accès complet, gestion des comptes.
            <br />
            <strong>Responsable</strong> : tout sauf la suppression définitive.
            <br />
            <strong>Employé</strong> : réservations, locations, clients au quotidien.
          </p>

          {!isEdit ? (
            <Field
              label="Mot de passe"
              htmlFor="user-password"
              required
              error={fieldErrors.password}
              hint="8 caractères minimum · à communiquer à la personne concernée"
            >
              <div className="flex gap-2">
                <Input
                  id="user-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  className="font-mono"
                />
                <Button type="button" variant="outline" onClick={generate}>
                  <Wand2 className="size-4" />
                  Générer
                </Button>
                {password ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Copier le mot de passe"
                    onClick={() => {
                      navigator.clipboard.writeText(password);
                      toast.success("Mot de passe copié.");
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                ) : null}
              </div>
            </Field>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEdit ? "Enregistrer" : "Créer le compte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
