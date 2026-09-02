"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/checkbox";
import { saveSettings } from "@/server/actions/settings";
import type { AppSettings } from "@/lib/settings";

/**
 * Paramètres de l'agence.
 *
 * Chaque valeur modifiée ici change immédiatement le comportement du site :
 * durée minimale de location, seuils d'alerte, coordonnées affichées.
 * Aucune de ces règles n'est codée en dur dans les composants.
 */
export function SettingsForm({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState(settings);

  function setSection<S extends keyof typeof values>(
    section: S,
    key: keyof (typeof values)[S],
    value: unknown,
  ) {
    setValues((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value },
    }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveSettings(values);
      if (result.ok) {
        toast.success("Paramètres enregistrés.");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-lg bg-[var(--color-danger-soft)] px-4 py-3 text-[13.5px] font-medium text-[var(--color-danger)]"
        >
          <AlertCircle className="mt-px size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {/* ------------------------- Agence ------------------------- */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Coordonnées de l&apos;agence</CardTitle>
            <CardDescription>
              Affichées sur le site, dans les emails et les liens WhatsApp.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de l'agence" htmlFor="agency-name">
            <Input
              id="agency-name"
              value={values.agency.name}
              onChange={(event) => setSection("agency", "name", event.target.value)}
            />
          </Field>
          <Field label="Email" htmlFor="agency-email">
            <Input
              id="agency-email"
              type="email"
              value={values.agency.email}
              onChange={(event) => setSection("agency", "email", event.target.value)}
            />
          </Field>
          <Field label="Téléphone fixe" htmlFor="agency-phone">
            <Input
              id="agency-phone"
              value={values.agency.phone}
              onChange={(event) => setSection("agency", "phone", event.target.value)}
            />
          </Field>
          <Field label="Mobile" htmlFor="agency-mobile">
            <Input
              id="agency-mobile"
              value={values.agency.mobile}
              onChange={(event) => setSection("agency", "mobile", event.target.value)}
            />
          </Field>
          <Field
            label="Numéro WhatsApp"
            htmlFor="agency-whatsapp"
            hint="format international sans +, ex. 212661805808"
          >
            <Input
              id="agency-whatsapp"
              value={values.agency.whatsapp}
              onChange={(event) => setSection("agency", "whatsapp", event.target.value)}
            />
          </Field>
          <Field label="Horaires" htmlFor="agency-hours">
            <Input
              id="agency-hours"
              value={values.agency.openingHours}
              onChange={(event) =>
                setSection("agency", "openingHours", event.target.value)
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Adresse" htmlFor="agency-address">
              <Input
                id="agency-address"
                value={values.agency.address}
                onChange={(event) => setSection("agency", "address", event.target.value)}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ----------------------- Réservation ----------------------- */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Règles de réservation</CardTitle>
            <CardDescription>
              Appliquées à chaque demande envoyée depuis le site.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Durée minimale (jours)" htmlFor="min-days">
            <Input
              id="min-days"
              type="number"
              min={1}
              max={30}
              value={values.reservation.minRentalDays}
              onChange={(event) =>
                setSection("reservation", "minRentalDays", Number(event.target.value))
              }
            />
          </Field>
          <Field label="Durée maximale (jours)" htmlFor="max-days">
            <Input
              id="max-days"
              type="number"
              min={1}
              max={365}
              value={values.reservation.maxRentalDays}
              onChange={(event) =>
                setSection("reservation", "maxRentalDays", Number(event.target.value))
              }
            />
          </Field>
          <Field
            label="Délai minimum (heures)"
            htmlFor="min-advance"
            hint="entre la demande et le départ"
          >
            <Input
              id="min-advance"
              type="number"
              min={0}
              max={168}
              value={values.reservation.minAdvanceHours}
              onChange={(event) =>
                setSection("reservation", "minAdvanceHours", Number(event.target.value))
              }
            />
          </Field>
          <Field
            label="Tolérance de retour (minutes)"
            htmlFor="grace"
            hint="avant de facturer un jour de plus"
          >
            <Input
              id="grace"
              type="number"
              min={0}
              max={720}
              value={values.reservation.graceMinutes}
              onChange={(event) =>
                setSection("reservation", "graceMinutes", Number(event.target.value))
              }
            />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Toggle
              label="Exiger la CIN et le permis dès l'envoi de la demande de réservation"
              checked={values.reservation.requireDocumentsAtBooking}
              onChange={(checked) =>
                setSection("reservation", "requireDocumentsAtBooking", checked)
              }
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Politique d'annulation" htmlFor="cancellation">
              <Textarea
                id="cancellation"
                rows={2}
                value={values.reservation.cancellationPolicy}
                onChange={(event) =>
                  setSection("reservation", "cancellationPolicy", event.target.value)
                }
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ----------------------- Maintenance ----------------------- */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Seuils d&apos;alerte</CardTitle>
            <CardDescription>
              Déclenchent les notifications automatiques du tableau de bord.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Vidange (km avant)" htmlFor="oil-alert">
            <Input
              id="oil-alert"
              type="number"
              min={50}
              max={5000}
              step={50}
              value={values.maintenance.oilChangeAlertKm}
              onChange={(event) =>
                setSection("maintenance", "oilChangeAlertKm", Number(event.target.value))
              }
            />
          </Field>
          <Field label="Assurance (jours avant)" htmlFor="insurance-alert">
            <Input
              id="insurance-alert"
              type="number"
              min={1}
              max={180}
              value={values.maintenance.insuranceAlertDays}
              onChange={(event) =>
                setSection(
                  "maintenance",
                  "insuranceAlertDays",
                  Number(event.target.value),
                )
              }
            />
          </Field>
          <Field label="Visite technique (jours avant)" htmlFor="inspection-alert">
            <Input
              id="inspection-alert"
              type="number"
              min={1}
              max={180}
              value={values.maintenance.inspectionAlertDays}
              onChange={(event) =>
                setSection(
                  "maintenance",
                  "inspectionAlertDays",
                  Number(event.target.value),
                )
              }
            />
          </Field>
          <Field label="Documents clients (jours avant)" htmlFor="document-alert">
            <Input
              id="document-alert"
              type="number"
              min={1}
              max={180}
              value={values.maintenance.documentAlertDays}
              onChange={(event) =>
                setSection(
                  "maintenance",
                  "documentAlertDays",
                  Number(event.target.value),
                )
              }
            />
          </Field>
        </CardContent>
      </Card>

      {/* ---------------------- Notifications ---------------------- */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Canaux de notification</CardTitle>
            <CardDescription>
              L&apos;envoi d&apos;emails nécessite la configuration de EMAIL_DRIVER dans
              les variables d&apos;environnement.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toggle
            label="Alertes dans le tableau de bord"
            checked={values.notifications.dashboardEnabled}
            onChange={(checked) =>
              setSection("notifications", "dashboardEnabled", checked)
            }
          />
          <Toggle
            label="Emails transactionnels (confirmation, refus, rappels)"
            checked={values.notifications.emailEnabled}
            onChange={(checked) => setSection("notifications", "emailEnabled", checked)}
          />
          <Toggle
            label="Notifications WhatsApp (nécessite une API tierce)"
            checked={values.notifications.whatsappEnabled}
            onChange={(checked) =>
              setSection("notifications", "whatsappEnabled", checked)
            }
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Enregistrer les paramètres
        </Button>
      </div>
    </form>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-navy-100 px-4 py-3">
      <span className="text-[13.5px] text-navy-700">{label}</span>
      <Switch
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
