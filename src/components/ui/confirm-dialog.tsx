"use client";

import * as React from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/**
 * Confirmation avant toute action destructive ou irréversible
 * (supprimer un véhicule, annuler une réservation, supprimer un document).
 * Le texte doit toujours nommer l'objet concerné, jamais « cet élément ».
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "danger",
  onConfirm,
  disabled,
}: {
  trigger: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger asChild disabled={disabled}>
        {trigger}
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-navy-950/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-navy-100 bg-white p-6 shadow-[var(--shadow-lift)] data-[state=open]:animate-in data-[state=open]:zoom-in-95">
          <div className="flex gap-4">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                tone === "danger"
                  ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
                  : "bg-teal-50 text-teal-700",
              )}
            >
              <AlertTriangle className="size-5" />
            </span>
            <div className="min-w-0">
              <AlertDialog.Title className="text-[15px] font-semibold text-navy-900">
                {title}
              </AlertDialog.Title>
              <AlertDialog.Description asChild>
                <div className="mt-1.5 text-sm leading-relaxed text-navy-600">
                  {description}
                </div>
              </AlertDialog.Description>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {cancelLabel}
            </AlertDialog.Cancel>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await onConfirm();
                  setOpen(false);
                })
              }
              className={cn(
                buttonVariants({
                  variant: tone === "danger" ? "danger" : "primary",
                  size: "sm",
                }),
              )}
            >
              {pending ? "En cours…" : confirmLabel}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
