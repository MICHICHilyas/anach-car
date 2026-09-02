"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * État d'ouverture du menu latéral, partagé entre le bouton (dans l'en-tête)
 * et le panneau lui-même (rendu hors de l'en-tête).
 *
 * Pourquoi les séparer : l'en-tête porte un `backdrop-blur`, et un élément
 * filtré devient le bloc conteneur de ses descendants `position: fixed`.
 * Une barre latérale rendue à l'intérieur de l'en-tête se retrouvait donc
 * limitée à la hauteur de celui-ci au lieu d'occuper tout l'écran.
 */
type NavState = { open: boolean; setOpen: (open: boolean) => void };

const AdminNavContext = createContext<NavState>({
  open: false,
  setOpen: () => undefined,
});

export function AdminNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // Verrouille le défilement du corps tant que le panneau mobile est ouvert.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AdminNavContext.Provider value={{ open, setOpen }}>
      {children}
    </AdminNavContext.Provider>
  );
}

export function useAdminNav() {
  return useContext(AdminNavContext);
}
