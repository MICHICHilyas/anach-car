"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { changeOwnPassword } from "@/server/actions/users";

/**
 * Changement de son propre mot de passe.
 *
 * Toutes les sessions tombent, y compris celle en cours : c'est voulu, et
 * annoncé à l'utilisateur avant qu'il valide. Un mot de passe changé parce
 * qu'on le croit compromis ne doit laisser vivre aucune session ouverte
 * ailleurs.
 */
export function ChangePasswordForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(formData: FormData) {
    setErrors({});
    start(async () => {
      const result = await changeOwnPassword({
        currentPassword: String(formData.get("currentPassword") ?? ""),
        password: String(formData.get("password") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? ""),
      });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? "Le mot de passe n'a pas été modifié.");
        return;
      }

      toast.success("Mot de passe modifié. Reconnectez-vous.");
      // La session vient d'être invalidée : on renvoie vers la connexion.
      router.push("/admin/login");
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <Field label="Mot de passe actuel" error={errors.currentPassword}>
        <Input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field
        label="Nouveau mot de passe"
        hint="8 caractères minimum"
        error={errors.password}
      >
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Field label="Confirmer le nouveau mot de passe" error={errors.confirmPassword}>
        <Input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <p className="text-[13px] leading-relaxed text-navy-500">
        Après validation, vous serez déconnecté de tous vos appareils et devrez
        vous reconnecter avec le nouveau mot de passe.
      </p>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <KeyRound className="size-4" />
        )}
        Modifier le mot de passe
      </Button>
    </form>
  );
}
