import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AGENCY } from "@/config/agency";
import { Logo } from "@/components/site/logo";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Connexion — Espace agence",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const redirectTo = typeof params.redirect === "string" ? params.redirect : "/admin";

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* ------------------ Colonne formulaire ------------------ */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Logo href="/fr" size="lg" />

          <h1 className="mt-12 text-[1.75rem] font-semibold tracking-tight text-navy-950">
            Espace agence
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-navy-500">
            Connectez-vous pour gérer les réservations, la flotte et les clients.
          </p>

          <div className="mt-8">
            <LoginForm redirectTo={redirectTo} />
          </div>

          <Link
            href="/fr"
            className="mt-10 inline-flex items-center gap-2 text-[13px] font-medium text-navy-400 transition-colors hover:text-navy-700"
          >
            <ArrowLeft className="size-3.5" />
            Retour au site
          </Link>
        </div>
      </div>

      {/* ------------------ Colonne visuelle ------------------ */}
      <div className="surface-deep relative hidden flex-col justify-end p-14 lg:flex">
        <blockquote className="max-w-md">
          <p className="font-[family-name:var(--font-display)] text-[1.9rem] font-semibold leading-tight tracking-tight text-white">
            Toute votre flotte, vos réservations et vos entretiens au même endroit.
          </p>
          <footer className="mt-6 text-[13.5px] text-navy-400">
            {AGENCY.name} — {AGENCY.city}
          </footer>
        </blockquote>
      </div>
    </div>
  );
}
