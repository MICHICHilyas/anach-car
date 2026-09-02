"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  deleteVehicleImage,
  setPrimaryImage,
  uploadVehicleImage,
} from "@/server/actions/vehicles";
import { cn } from "@/lib/utils";

/** Gestion des photos d'un véhicule : ajout, photo principale, suppression. */
export function VehicleImages({
  vehicleId,
  images,
}: {
  vehicleId: string;
  images: { id: string; url: string; isPrimary: boolean }[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);

  function upload(files: FileList | null) {
    if (!files?.length) return;
    startTransition(async () => {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadVehicleImage(vehicleId, formData);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
      }
      toast.success("Photo(s) ajoutée(s).");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => (
            <li
              key={image.id}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-navy-50"
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="200px"
                className="object-cover"
              />

              {image.isPrimary ? (
                <span className="absolute start-2 top-2 rounded-full bg-teal-600 px-2 py-0.5 text-[10.5px] font-bold text-white">
                  Principale
                </span>
              ) : null}

              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1.5 bg-gradient-to-t from-navy-950/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                {!image.isPrimary ? (
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await setPrimaryImage(image.id);
                        if (result.ok) {
                          toast.success("Photo principale mise à jour.");
                          router.refresh();
                        } else toast.error(result.error);
                      })
                    }
                    className="rounded-md bg-white/95 p-1.5 text-navy-700 transition-colors hover:text-teal-700"
                    aria-label="Définir comme photo principale"
                  >
                    <Star className="size-3.5" />
                  </button>
                ) : null}

                <ConfirmDialog
                  trigger={
                    <button
                      type="button"
                      className="rounded-md bg-white/95 p-1.5 text-[var(--color-danger)]"
                      aria-label="Supprimer la photo"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  }
                  title="Supprimer cette photo ?"
                  description="La photo sera définitivement retirée de la fiche et du site public."
                  confirmLabel="Supprimer"
                  onConfirm={async () => {
                    const result = await deleteVehicleImage(image.id);
                    if (result.ok) {
                      toast.success("Photo supprimée.");
                      router.refresh();
                    } else toast.error(result.error);
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          upload(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
          dragOver ? "border-teal-400 bg-teal-50/50" : "border-navy-200 bg-navy-50/40",
        )}
      >
        {pending ? (
          <Loader2 className="size-5 animate-spin text-teal-600" />
        ) : (
          <ImagePlus className="size-5 text-navy-400" />
        )}
        <p className="mt-2.5 text-[13px] text-navy-600">
          Glissez vos photos ici, ou
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2.5"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          Choisir des fichiers
        </Button>
        <p className="mt-2.5 text-[11.5px] text-navy-400">
          JPG, PNG, WebP ou AVIF · 6 Mo maximum par photo
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={(event) => {
            upload(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
