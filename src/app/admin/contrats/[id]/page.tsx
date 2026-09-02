import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getReservationDetail } from "@/server/queries/reservations";
import { getSettings } from "@/lib/settings";
import { AGENCY } from "@/config/agency";
import { formatDateTime, formatDateShort } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import {
  FUEL,
  FUEL_LEVEL,
  TRANSMISSION,
  VEHICLE_CATEGORY,
} from "@/lib/labels";
import { PrintButton } from "@/components/admin/print-button";
import { Logo } from "@/components/site/logo";

export const metadata = {
  title: "Contrat de location",
  robots: { index: false, follow: false },
};

/**
 * Contrat de location imprimable.
 *
 * Rendu hors de la coquille du dashboard : à l'impression, la page ne doit
 * contenir que le contrat, pas la navigation. Le format vise une feuille A4.
 */
export default async function ContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [reservation, settings] = await Promise.all([
    getReservationDetail(id),
    getSettings(),
  ]);
  if (!reservation) notFound();

  const customer = reservation.customer;
  const vehicle = reservation.vehicle;
  const rental = reservation.rental;

  const paid = reservation.payments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const remaining = Math.max(0, reservation.totalAmount - paid);

  return (
    <div className="min-h-dvh bg-navy-50/60 py-8 print:bg-white print:py-0">
      {/* Barre d'actions — jamais imprimée */}
      <div className="no-print container-page mb-6 flex items-center justify-between gap-4">
        <Link
          href={`/admin/reservations/${id}`}
          className="inline-flex items-center gap-2 text-[13.5px] font-medium text-navy-500 transition-colors hover:text-navy-900"
        >
          <ArrowLeft className="size-4" />
          Retour au dossier
        </Link>
        <PrintButton>
          <Printer className="size-4" />
          Imprimer le contrat
        </PrintButton>
      </div>

      {/* Feuille A4 */}
      <article className="mx-auto max-w-[820px] bg-white px-10 py-10 shadow-[var(--shadow-soft)] print:max-w-none print:px-0 print:py-0 print:shadow-none">
        {/* -------------------------- En-tête -------------------------- */}
        <header className="flex items-start justify-between gap-8 border-b-2 border-navy-900 pb-5">
          <div>
            <Logo href={null} size="md" />
            <p className="mt-3 text-[11.5px] leading-relaxed text-navy-600">
              {settings.agency.address}
              <br />
              Tél. {settings.agency.phone} · Mobile {settings.agency.mobile}
              <br />
              {settings.agency.email}
            </p>
          </div>

          <div className="shrink-0 text-end">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy-400">
              Contrat de location
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-[19px] font-bold tracking-tight text-navy-950">
              {reservation.reference}
            </p>
            <p className="mt-1 text-[11.5px] text-navy-500">
              Établi le {formatDateShort(new Date())}
            </p>
          </div>
        </header>

        {/* -------------------------- Parties -------------------------- */}
        <section className="mt-6 grid grid-cols-2 gap-6">
          <Block title="Le loueur">
            <Line label="Raison sociale" value={AGENCY.legalName} />
            <Line label="Adresse" value={AGENCY.address.full} />
            <Line label="Téléphone" value={settings.agency.mobile} />
            <Line label="RC / ICE" value="…………………………" />
          </Block>

          <Block title="Le locataire">
            <Line
              label="Nom et prénom"
              value={`${customer.lastName.toUpperCase()} ${customer.firstName}`}
            />
            <Line label="CIN / Passeport" value={customer.cin ?? "…………………………"} />
            <Line
              label="Permis n°"
              value={customer.licenseNumber ?? "…………………………"}
            />
            <Line label="Téléphone" value={customer.phone} />
            <Line
              label="Adresse"
              value={
                [customer.address, customer.city, customer.country]
                  .filter(Boolean)
                  .join(", ") || customer.country
              }
            />
          </Block>
        </section>

        {/* -------------------------- Véhicule -------------------------- */}
        <section className="mt-6">
          <SectionTitle>Véhicule loué</SectionTitle>
          <table className="mt-3 w-full border-collapse text-[12px]">
            <tbody>
              <Row
                cells={[
                  ["Marque et modèle", `${vehicle.brand} ${vehicle.model}`],
                  ["Année", String(vehicle.year)],
                  ["Immatriculation", vehicle.plate],
                ]}
              />
              <Row
                cells={[
                  ["Catégorie", VEHICLE_CATEGORY[vehicle.category]],
                  ["Transmission", TRANSMISSION[vehicle.transmission]],
                  ["Carburant", FUEL[vehicle.fuel]],
                ]}
              />
              <Row
                cells={[
                  [
                    "Km au départ",
                    rental
                      ? `${rental.startMileage.toLocaleString("fr-MA")} km`
                      : "…………………",
                  ],
                  [
                    "Carburant au départ",
                    rental ? FUEL_LEVEL[rental.startFuel] : "…………………",
                  ],
                  [
                    "Km au retour",
                    rental?.endMileage
                      ? `${rental.endMileage.toLocaleString("fr-MA")} km`
                      : "…………………",
                  ],
                ]}
              />
            </tbody>
          </table>
        </section>

        {/* -------------------------- Période -------------------------- */}
        <section className="mt-6">
          <SectionTitle>Durée de la location</SectionTitle>
          <table className="mt-3 w-full border-collapse text-[12px]">
            <tbody>
              <Row
                cells={[
                  ["Départ", formatDateTime(reservation.startAt)],
                  ["Retour prévu", formatDateTime(reservation.endAt)],
                  [
                    "Durée",
                    `${reservation.days} jour${reservation.days > 1 ? "s" : ""}`,
                  ],
                ]}
              />
              <Row
                cells={[
                  [
                    "Lieu de prise en charge",
                    reservation.pickupLocationLabel ?? AGENCY.address.locality,
                  ],
                  [
                    "Lieu de restitution",
                    reservation.dropoffLocationLabel ?? AGENCY.address.locality,
                  ],
                ]}
              />
            </tbody>
          </table>
        </section>

        {/* -------------------------- Montants -------------------------- */}
        <section className="mt-6">
          <SectionTitle>Conditions financières</SectionTitle>
          <table className="mt-3 w-full border-collapse text-[12px]">
            <tbody>
              <MoneyRow
                label={`Tarif journalier × ${reservation.days} jour${reservation.days > 1 ? "s" : ""}`}
                value={formatMoney(reservation.subtotal)}
              />
              {reservation.extraFees > 0 ? (
                <MoneyRow
                  label="Frais additionnels"
                  value={formatMoney(reservation.extraFees)}
                />
              ) : null}
              {reservation.discount > 0 ? (
                <MoneyRow
                  label="Remise"
                  value={`− ${formatMoney(reservation.discount)}`}
                />
              ) : null}
              <MoneyRow
                label="TOTAL À RÉGLER"
                value={formatMoney(reservation.totalAmount)}
                strong
              />
              <MoneyRow label="Déjà réglé" value={formatMoney(paid)} />
              <MoneyRow label="Reste à régler" value={formatMoney(remaining)} strong />
            </tbody>
          </table>
        </section>

        {/* -------------------------- Conditions -------------------------- */}
        <section className="mt-6">
          <SectionTitle>Conditions essentielles</SectionTitle>
          <ol className="mt-3 space-y-1.5 text-[10.5px] leading-relaxed text-navy-700">
            <li>
              1. Le véhicule est remis en bon état de marche, propre et assuré.
              Le locataire s&apos;engage à le restituer dans le même état, au
              lieu et à la date convenus.
            </li>
            <li>
              2. Le conducteur déclare être titulaire d&apos;un permis de
              conduire en cours de validité depuis plus de deux ans. Tout
              conducteur non déclaré au présent contrat n&apos;est pas couvert
              par l&apos;assurance.
            </li>
            <li>
              3. Le carburant est à la charge du locataire : le véhicule est
              restitué au même niveau qu&apos;au départ, à défaut de quoi le
              complément est facturé.
            </li>
            <li>
              4. Il est interdit de sous-louer le véhicule, de l&apos;utiliser
              pour un transport rémunéré, de participer à une compétition, ou de
              quitter le territoire marocain sans autorisation écrite.
            </li>
            <li>
              5. En cas d&apos;accident, un constat amiable est obligatoire. En
              cas de panne, le locataire prévient immédiatement l&apos;agence ;
              aucune réparation ne peut être engagée sans accord préalable.
            </li>
            <li>
              6. Le véhicule est vérifié au retour : état général, kilométrage
              et niveau de carburant. Tout écart constaté est facturé selon le
              tarif en vigueur.
            </li>
            <li>
              7. {settings.reservation.cancellationPolicy}
            </li>
            <li>
              8. Les conditions générales complètes sont remises au locataire et
              consultables sur {process.env.NEXT_PUBLIC_SITE_URL ?? "le site de l'agence"}
              /fr/conditions-generales. Tout litige relève des tribunaux
              d&apos;Inezgane-Aït Melloul.
            </li>
          </ol>
        </section>

        {/* -------------------------- Signatures -------------------------- */}
        <section className="mt-8 grid grid-cols-2 gap-10">
          <SignatureBlock
            title="Le loueur"
            subtitle={settings.agency.name}
          />
          <SignatureBlock
            title="Le locataire"
            subtitle="Lu et approuvé, bon pour accord"
          />
        </section>

        <footer className="mt-8 border-t border-navy-200 pt-3 text-center text-[9.5px] text-navy-400">
          {AGENCY.legalName} — {AGENCY.address.full} — Tél.{" "}
          {settings.agency.phone} — {settings.agency.email}
        </footer>
      </article>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-navy-200 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-navy-800">
      {children}
    </h2>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-navy-200 p-3.5">
      <h2 className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-teal-700">
        {title}
      </h2>
      <dl className="mt-2.5 space-y-1">{children}</dl>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-[11.5px]">
      <dt className="w-[105px] shrink-0 text-navy-500">{label}</dt>
      <dd className="font-medium text-navy-900">{value}</dd>
    </div>
  );
}

function Row({ cells }: { cells: [string, string][] }) {
  return (
    <tr>
      {cells.map(([label, value]) => (
        <td
          key={label}
          className="border border-navy-200 px-2.5 py-1.5 align-top"
          style={{ width: `${100 / cells.length}%` }}
        >
          <span className="block text-[9.5px] uppercase tracking-wide text-navy-400">
            {label}
          </span>
          <span className="mt-0.5 block font-medium text-navy-900">{value}</span>
        </td>
      ))}
    </tr>
  );
}

function MoneyRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <tr className={strong ? "bg-navy-50" : undefined}>
      <td className="border border-navy-200 px-2.5 py-1.5 text-navy-700">
        {strong ? <strong>{label}</strong> : label}
      </td>
      <td className="border border-navy-200 px-2.5 py-1.5 text-end tabular-nums text-navy-900">
        {strong ? <strong>{value}</strong> : value}
      </td>
    </tr>
  );
}

function SignatureBlock({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-navy-800">
        {title}
      </p>
      <p className="mt-0.5 text-[10px] text-navy-500">{subtitle}</p>
      <div className="mt-2 h-20 rounded border border-dashed border-navy-300" />
    </div>
  );
}
