"use client";

import { Toaster as SonnerToaster } from "sonner";

/** Retours d'action (succès / erreur) pour tout le dashboard. */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          borderRadius: "12px",
          border: "1px solid var(--color-navy-100)",
          color: "var(--color-navy-900)",
          fontSize: "13.5px",
        },
      }}
    />
  );
}
