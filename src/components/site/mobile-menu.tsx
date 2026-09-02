"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AGENCY } from "@/config/agency";
import { cn } from "@/lib/utils";

export function MobileMenu({
  links,
  bookLabel,
  callLabel,
  whatsappHref,
  whatsappLabel,
}: {
  links: { href: string; label: string }[];
  bookLabel: string;
  callLabel: string;
  whatsappHref: string;
  whatsappLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Le panneau se referme au clic sur un lien (voir onClick plus bas) plutôt
  // que par un effet sur le pathname : pas de rendu en cascade.

  // Verrouille le défilement de la page tant que le panneau est ouvert.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-10 items-center justify-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 lg:hidden"
        aria-label="Ouvrir le menu"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>

      {/*
        Le panneau est monté dans <body> via un portail : l'en-tête applique un
        `backdrop-blur`, et un élément filtré devient le bloc conteneur de ses
        descendants `position: fixed` — le tiroir se retrouverait alors écrasé
        à la hauteur de l'en-tête au lieu de couvrir l'écran.
      */}
      {open
        ? createPortal(
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <nav className="absolute inset-y-0 end-0 flex w-[85%] max-w-sm flex-col bg-white shadow-2xl animate-[fade-up_0.25s_ease-out]">
            <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
              <span className="text-[13px] font-semibold uppercase tracking-wide text-navy-400">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-lg text-navy-500 hover:bg-navy-50"
                aria-label="Fermer le menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-xl px-4 py-3.5 text-[15px] font-medium transition-colors",
                    pathname === link.href
                      ? "bg-teal-50 text-teal-800"
                      : "text-navy-800 hover:bg-navy-50",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="space-y-2.5 border-t border-navy-100 p-5">
              <Button asChild size="lg" className="w-full">
                <Link href={links[1]?.href ?? "/"}>{bookLabel}</Link>
              </Button>
              <div className="grid grid-cols-2 gap-2.5">
                <Button asChild variant="outline">
                  <a href={`tel:${AGENCY.phone.mobileHref}`}>
                    <Phone className="size-4" />
                    {callLabel}
                  </a>
                </Button>
                <Button asChild variant="whatsapp">
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="size-4" />
                    {whatsappLabel}
                  </a>
                </Button>
              </div>
            </div>
          </nav>
        </div>,
        document.body,
          )
        : null}
    </>
  );
}
