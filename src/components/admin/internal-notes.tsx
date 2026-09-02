"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

/**
 * Note interne, jamais visible par le client.
 * Composant générique : l'action de sauvegarde est injectée par l'appelant.
 */
export function InternalNotes({
  initialValue,
  onSave,
  placeholder = "Note interne : préférences du client, remarques sur le dossier…",
}: {
  initialValue: string;
  onSave: (value: string) => Promise<{ ok: boolean; error?: string }>;
  placeholder?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [pending, startTransition] = useTransition();
  const dirty = value !== initialValue;

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        rows={4}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-navy-400">
          Visible uniquement par l&apos;équipe de l&apos;agence.
        </p>
        <Button
          size="sm"
          variant={dirty ? "primary" : "outline"}
          disabled={!dirty || pending}
          onClick={() =>
            startTransition(async () => {
              const result = await onSave(value);
              if (result.ok) {
                toast.success("Note enregistrée.");
                router.refresh();
              } else {
                toast.error(result.error ?? "Enregistrement impossible.");
              }
            })
          }
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
