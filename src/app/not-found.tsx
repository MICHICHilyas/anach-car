import Link from "next/link";

/**
 * 404 global (URL hors des segments de langue).
 * Volontairement minimal : la version soignée vit dans [locale]/not-found.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-[family-name:var(--font-display)] text-[3rem] font-bold text-navy-200">
        404
      </p>
      <h1 className="mt-2 text-[1.4rem] font-semibold text-navy-950">
        Page introuvable
      </h1>
      <p className="mt-2 max-w-sm text-[14px] text-navy-500">
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/fr"
        className="mt-7 rounded-lg bg-teal-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-teal-700"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
