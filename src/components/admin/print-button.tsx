"use client";

import { Button } from "@/components/ui/button";

/** Déclenche l'impression de la page courante. */
export function PrintButton({ children }: { children: React.ReactNode }) {
  return (
    <Button onClick={() => window.print()} size="sm">
      {children}
    </Button>
  );
}
