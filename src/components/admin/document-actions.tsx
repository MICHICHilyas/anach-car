"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteDocument } from "@/server/actions/documents";

export function DocumentActions({
  documentId,
  label,
}: {
  documentId: string;
  label: string;
}) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          className="rounded-md p-1.5 text-navy-400 transition-colors hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
          aria-label={`Supprimer ${label}`}
        >
          <Trash2 className="size-4" />
        </button>
      }
      title="Supprimer ce document ?"
      description={
        <>
          Le fichier « {label} » sera définitivement effacé du stockage.
          Cette action est irréversible et sera enregistrée dans le journal
          d&apos;activité.
        </>
      }
      confirmLabel="Supprimer"
      onConfirm={async () => {
        const result = await deleteDocument(documentId);
        if (result.ok) {
          toast.success("Document supprimé.");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }}
    />
  );
}
