"use client";

import { useRef, useState } from "react";
import { FileCheck2, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Dépôt d'un fichier unique.
 *
 * Le champ natif est masqué : son rendu par défaut est illisible et diffère
 * d'un navigateur à l'autre. On garde toutefois l'élément réel dans le DOM
 * pour conserver le comportement clavier et les lecteurs d'écran.
 *
 * La taille est vérifiée ici pour prévenir l'utilisateur tout de suite ;
 * le serveur la revérifie de toute façon, c'est lui qui fait autorité.
 */
export function FileField({
  id,
  label,
  hint,
  accept = "image/jpeg,image/png,image/webp,image/avif,application/pdf",
  maxBytes = 10 * 1024 * 1024,
  required,
  error,
  chooseLabel,
  replaceLabel,
  removeLabel,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  accept?: string;
  maxBytes?: number;
  required?: boolean;
  error?: string;
  chooseLabel: string;
  replaceLabel: string;
  removeLabel: string;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function select(next: File | null) {
    setLocalError(null);

    if (next && next.size > maxBytes) {
      setLocalError(
        `Fichier trop volumineux (${Math.round(next.size / 1024 / 1024)} Mo). Maximum : ${Math.round(maxBytes / 1024 / 1024)} Mo.`,
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setFile(next);
    onChange(next);
  }

  const message = error ?? localError;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-baseline gap-1.5 text-[13px] font-medium text-navy-800"
      >
        {label}
        {required ? (
          <span className="text-[var(--color-danger)]" aria-hidden>
            *
          </span>
        ) : null}
      </label>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        aria-invalid={Boolean(message)}
        onChange={(event) => select(event.target.files?.[0] ?? null)}
      />

      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-teal-200 bg-teal-50/60 px-3.5 py-2.5">
          <FileCheck2 className="size-4 shrink-0 text-teal-700" />
          <span className="min-w-0 flex-1 truncate text-[13px] text-teal-900">
            {file.name}
          </span>
          <span className="shrink-0 text-[11.5px] text-teal-700/70">
            {(file.size / 1024).toFixed(0)} Ko
          </span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="shrink-0 text-[12px] font-medium text-teal-700 underline underline-offset-2"
          >
            {replaceLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              select(null);
            }}
            aria-label={removeLabel}
            className="shrink-0 rounded p-0.5 text-teal-700/60 hover:text-[var(--color-danger)]"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg border border-dashed px-3.5 py-3 text-[13px] transition-colors",
            message
              ? "border-[var(--color-danger)] bg-[var(--color-danger-soft)]/40 text-[var(--color-danger)]"
              : "border-navy-200 bg-navy-50/40 text-navy-600 hover:border-teal-400 hover:bg-teal-50/50",
          )}
        >
          <Paperclip className="size-4 shrink-0" />
          {chooseLabel}
        </button>
      )}

      {message ? (
        <p role="alert" className="text-[12.5px] font-medium text-[var(--color-danger)]">
          {message}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-navy-400">{hint}</p>
      ) : null}
    </div>
  );
}
