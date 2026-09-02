"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Filet de sécurité global. Le message technique n'est jamais montré au
 * visiteur : il part dans les journaux du serveur.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] erreur non gérée", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-[var(--color-danger-soft)]">
        <AlertTriangle className="size-6 text-[var(--color-danger)]" />
      </span>
      <h1 className="mt-6 text-[1.4rem] font-semibold text-navy-950">
        Une erreur est survenue
      </h1>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-navy-500">
        Nous n&apos;avons pas pu afficher cette page. Réessayez dans un instant — si
        le problème persiste, appelez-nous au +212 6 61 80 58 08.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-7 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-teal-700"
      >
        <RotateCw className="size-4" />
        Réessayer
      </button>
      {error.digest ? (
        <p className="mt-6 font-mono text-[11px] text-navy-300">
          Référence : {error.digest}
        </p>
      ) : null}
    </div>
  );
}
