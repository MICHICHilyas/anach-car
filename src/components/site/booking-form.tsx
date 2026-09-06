"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { FileField } from "@/components/ui/file-field";
import { compressImage } from "@/lib/compress-image";
import { createReservation } from "@/server/actions/booking";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

/**
 * Formulaire de demande de réservation.
 *
 * Aucun compte n'est requis. Les erreurs renvoyées par le serveur sont
 * réaffichées champ par champ ; le serveur reste seul juge de la validité.
 */
export function BookingForm({
  locale,
  t,
  vehicleId,
  period,
  pickupLocationId,
  dropoffLocationId,
  pickupLocationText,
  dropoffLocationText,
}: {
  locale: Locale;
  t: Dictionary;
  vehicleId: string;
  period: { start: string; startTime: string; end: string; endTime: string };
  pickupLocationId?: string;
  dropoffLocationId?: string;
  /** Adresse saisie librement, si le client n'a pas choisi un lieu de la liste. */
  pickupLocationText?: string;
  dropoffLocationText?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Les fichiers ne passent pas par FormData : ils sont transmis en second
  // argument de la server action, qui accepte des objets File.
  const [cinFile, setCinFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setGlobalError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await createReservation(
        {
        vehicleId,
        startDate: period.start,
        startTime: period.startTime,
        endDate: period.end,
        endTime: period.endTime,
        pickupLocationId: pickupLocationId ?? null,
        dropoffLocationId: dropoffLocationId ?? null,
        pickupLocationText: pickupLocationText ?? "",
        dropoffLocationText: dropoffLocationText ?? "",
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        email: String(formData.get("email") ?? ""),
        cin: String(formData.get("cin") ?? ""),
        licenseNumber: String(formData.get("licenseNumber") ?? ""),
        country: String(formData.get("country") ?? ""),
        city: String(formData.get("city") ?? ""),
        address: String(formData.get("address") ?? ""),
        comment: String(formData.get("comment") ?? ""),
        acceptTerms: formData.get("acceptTerms") === "on",
        website: String(formData.get("website") ?? ""),
        },
        {
          /*
           * Compression dans le navigateur : une photo de CIN prise au
           * téléphone pèse plusieurs mégaoctets, ce qui faisait dépasser la
           * taille maximale d'une requête et échouer la réservation sans
           * message explicite. Réduire ici allège aussi l'envoi en 4G.
           */
          cin: cinFile ? await compressImage(cinFile) : null,
          license: licenseFile ? await compressImage(licenseFile) : null,
        },
      );

      if (result.ok) {
        router.push(
          `/${locale}/reservation/confirmation?ref=${encodeURIComponent(
            result.reference,
          )}&t=${result.token}`,
        );
        return;
      }

      setGlobalError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {globalError ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] px-4 py-3.5"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--color-danger)]" />
          <div>
            <p className="text-[13.5px] font-semibold text-[var(--color-danger)]">
              {t.booking.validationTitle}
            </p>
            <p className="mt-0.5 text-[13px] text-[var(--color-danger)]/90">
              {globalError}
            </p>
          </div>
        </div>
      ) : null}

      {/* ------------------ Informations personnelles ------------------ */}
      <fieldset className="space-y-4">
        <legend className="text-[15px] font-semibold text-navy-950">
          {t.booking.sections.personal}
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t.booking.fields.firstName}
            htmlFor="firstName"
            required
            error={fieldErrors.firstName}
          >
            <Input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              required
              aria-invalid={Boolean(fieldErrors.firstName)}
            />
          </Field>
          <Field
            label={t.booking.fields.lastName}
            htmlFor="lastName"
            required
            error={fieldErrors.lastName}
          >
            <Input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              required
              aria-invalid={Boolean(fieldErrors.lastName)}
            />
          </Field>
          <Field
            label={t.booking.fields.phone}
            htmlFor="phone"
            required
            error={fieldErrors.phone}
            hint="+212 6 61 80 58 08"
          >
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              aria-invalid={Boolean(fieldErrors.phone)}
            />
          </Field>
          <Field
            label={t.booking.fields.email}
            htmlFor="email"
            error={fieldErrors.email}
            hint={t.common.optional}
          >
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
            />
          </Field>
          <Field
            label={t.booking.fields.cin}
            htmlFor="cin"
            error={fieldErrors.cin}
            hint={t.common.optional}
          >
            <Input id="cin" name="cin" aria-invalid={Boolean(fieldErrors.cin)} />
          </Field>
          <Field
            label={t.booking.fields.licenseNumber}
            htmlFor="licenseNumber"
            error={fieldErrors.licenseNumber}
            hint={t.common.optional}
          >
            <Input id="licenseNumber" name="licenseNumber" />
          </Field>
          <Field label={t.booking.fields.country} htmlFor="country">
            <Input
              id="country"
              name="country"
              defaultValue="Maroc"
              autoComplete="country-name"
            />
          </Field>
          <Field label={t.booking.fields.city} htmlFor="city">
            <Input id="city" name="city" autoComplete="address-level2" />
          </Field>
        </div>

        <Field label={t.booking.fields.address} htmlFor="address">
          <Input id="address" name="address" autoComplete="street-address" />
        </Field>

        <Field label={t.booking.fields.comment} htmlFor="comment">
          <Textarea
            id="comment"
            name="comment"
            rows={4}
            placeholder={t.booking.fields.commentPlaceholder}
          />
        </Field>
      </fieldset>

      {/* -------------------------- Documents -------------------------- */}
      <fieldset className="space-y-4">
        <legend className="text-[15px] font-semibold text-navy-950">
          {t.booking.sections.documents}
        </legend>

        <p className="text-[13px] leading-relaxed text-navy-500">
          {t.booking.documentsHint}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <FileField
            id="cinFile"
            label={t.booking.docs.cin}
            hint={t.booking.docs.formats}
            required
            error={fieldErrors.cinFile}
            chooseLabel={t.booking.docs.choose}
            replaceLabel={t.booking.docs.replace}
            removeLabel={t.booking.docs.remove}
            onChange={setCinFile}
          />
          <FileField
            id="licenseFile"
            label={t.booking.docs.license}
            hint={t.booking.docs.formats}
            required
            error={fieldErrors.licenseFile}
            chooseLabel={t.booking.docs.choose}
            replaceLabel={t.booking.docs.replace}
            removeLabel={t.booking.docs.remove}
            onChange={setLicenseFile}
          />
        </div>

        <p className="flex items-start gap-2.5 rounded-lg bg-teal-50/70 px-4 py-3 text-[12.5px] leading-relaxed text-teal-900">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-700" />
          {t.booking.docs.secure}
        </p>
      </fieldset>

      {/* Pot de miel : invisible pour un humain, rempli par les robots. */}
      <div className="absolute -left-[9999px]" aria-hidden>
        <label htmlFor="website">Ne pas remplir</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-4 border-t border-navy-100 pt-6">
        <label className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-relaxed text-navy-600">
          <Checkbox name="acceptTerms" required className="mt-0.5" />
          <span>
            {t.booking.terms}{" "}
            <Link
              href={`/${locale}/conditions-generales`}
              className="font-medium text-teal-700 underline underline-offset-2"
              target="_blank"
            >
              {t.footer.terms}
            </Link>
          </span>
        </label>
        {fieldErrors.acceptTerms ? (
          <p role="alert" className="text-[12.5px] font-medium text-[var(--color-danger)]">
            {fieldErrors.acceptTerms}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t.booking.submitting}
            </>
          ) : (
            t.booking.submit
          )}
        </Button>
      </div>
    </form>
  );
}
