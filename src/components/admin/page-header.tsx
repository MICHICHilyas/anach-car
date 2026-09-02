import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** En-tête standard des pages du dashboard : fil d'Ariane, titre, actions. */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {breadcrumbs?.length ? (
        <nav aria-label="Fil d'Ariane" className="mb-2.5">
          <ol className="flex flex-wrap items-center gap-1 text-[12.5px] text-navy-400">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center gap-1">
                {index > 0 ? (
                  <ChevronRight className="size-3.5 rtl:rotate-180" />
                ) : null}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-navy-700"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-navy-600">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.5rem] font-semibold tracking-tight text-navy-950">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-[13.5px] text-navy-500">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
      </div>
    </div>
  );
}
