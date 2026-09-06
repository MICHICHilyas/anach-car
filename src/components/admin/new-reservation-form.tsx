"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { FileField } from "@/components/ui/file-field";
import { createAdminReservation } from "@/server/actions/reservations";
import { formatMoney } from "@/lib/money";
import { compressImage } from "@/lib/compress-image";
import { RESERVATION_SOURCE } from "@/lib/labels";
import { toLocalDateInput } from "@/lib/search-params";

type VehicleOption = {
  id: string;
  label: string;
  dailyRate: number;
  rate3Days: number | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
};

/**
 * Saisie d'une réservation au comptoir ou par téléphone.
 * Le total affiché est indicatif : le devis qui fait foi est recalculé côté
 * serveur au moment de l'enregistrement.
 */
export function NewReservationForm({
  vehicles,
  customers,
}: {
  vehicles: VehicleOption[];
  customers: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newCustomer, setNewCustomer] = useState(customers.length === 0);
  // Pièces d'identité photographiées au comptoir.
  const [cinFile, setCinFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [form, setForm] = useState(() => ({
    vehicleId: vehicles[0]?.id ?? "",
    customerId: customers[0]?.id ?? "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    cin: "",
    startDate: toLocalDateInput(new Date()),
    startTime: "10:00",
    endDate: toLocalDateInput(new Date(Date.now() + 3 * 86400000)),
    endTime: "10:00",
    source: "WALK_IN",
    confirmImmediately: true,
    internalNotes: "",
  }));

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  // Estimation locale, à titre indicatif pour l'employé.
  const estimate = useMemo(() => {
    const vehicle = vehicles.find((item) => item.id === form.vehicleId);
    if (!vehicle) return null;
    const start = new Date(`${form.startDate}T${form.startTime}`);
    const end = new Date(`${form.endDate}T${form.endTime}`);
    const ms = end.getTime() - start.getTime();
    if (!Number.isFinite(ms) || ms <= 0) return null;

    const days = Math.max(1, Math.ceil((ms - 3600000) / 86400000));
    const rate =
      days >= 30 && vehicle.monthlyRate
        ? vehicle.monthlyRate
        : days >= 7 && vehicle.weeklyRate
          ? vehicle.weeklyRate
          : days >= 3 && vehicle.rate3Days
            ? vehicle.rate3Days
            : vehicle.dailyRate;
    return { days, rate, total: rate * days };
  }, [form, vehicles]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createAdminReservation(
        {
          ...form,
          customerId: newCustomer ? undefined : form.customerId,
        },
        {
          // Le gérant photographie les papiers au téléphone : sans
          // compression, la requête dépasse la taille maximale et la
          // réservation échoue sans message explicite.
          cin: cinFile ? await compressImage(cinFile) : null,
          license: licenseFile ? await compressImage(licenseFile) : null,
        },
      );

      if (result.ok && result.data) {
        toast.success(`Réservation ${result.data.reference} créée.`);
        router.push(`/admin/reservations/${result.data.id}`);
        router.refresh();
        return;
      }
      if (result.ok) {
        router.push("/admin/reservations");
        return;
      }
      setError(result.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1.5fr_1fr]" noValidate>
      <div className="space-y-5">
        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2.5 rounded-lg bg-[var(--color-danger-soft)] px-4 py-3 text-[13.5px] font-medium text-[var(--color-danger)]"
          >
            <AlertCircle className="mt-px size-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Véhicule et période</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Véhicule" htmlFor="new-vehicle" required>
              <NativeSelect
                id="new-vehicle"
                value={form.vehicleId}
                onChange={(event) => set("vehicleId", event.target.value)}
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.label} — {formatMoney(vehicle.dailyRate)} / jour
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date de départ" htmlFor="new-start" required>
                <div className="flex gap-2">
                  <Input
                    id="new-start"
                    type="date"
                    value={form.startDate}
                    onChange={(event) => set("startDate", event.target.value)}
                  />
                  <Input
                    type="time"
                    step={1800}
                    aria-label="Heure de départ"
                    value={form.startTime}
                    onChange={(event) => set("startTime", event.target.value)}
                    className="w-[5.5rem] shrink-0 sm:w-[6.5rem]"
                  />
                </div>
              </Field>
              <Field label="Date de retour" htmlFor="new-end" required>
                <div className="flex gap-2">
                  <Input
                    id="new-end"
                    type="date"
                    min={form.startDate}
                    value={form.endDate}
                    onChange={(event) => set("endDate", event.target.value)}
                  />
                  <Input
                    type="time"
                    step={1800}
                    aria-label="Heure de retour"
                    value={form.endTime}
                    onChange={(event) => set("endTime", event.target.value)}
                    className="w-[5.5rem] shrink-0 sm:w-[6.5rem]"
                  />
                </div>
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setNewCustomer((value) => !value)}
            >
              <UserPlus className="size-4" />
              {newCustomer ? "Choisir un client existant" : "Nouveau client"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {newCustomer ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Prénom" htmlFor="new-firstname" required>
                  <Input
                    id="new-firstname"
                    value={form.firstName}
                    onChange={(event) => set("firstName", event.target.value)}
                  />
                </Field>
                <Field label="Nom" htmlFor="new-lastname" required>
                  <Input
                    id="new-lastname"
                    value={form.lastName}
                    onChange={(event) => set("lastName", event.target.value)}
                  />
                </Field>
                <Field label="Téléphone" htmlFor="new-phone" required>
                  <Input
                    id="new-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => set("phone", event.target.value)}
                  />
                </Field>
                <Field label="Email" htmlFor="new-email">
                  <Input
                    id="new-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => set("email", event.target.value)}
                  />
                </Field>
                <Field label="CIN / Passeport" htmlFor="new-cin">
                  <Input
                    id="new-cin"
                    value={form.cin}
                    onChange={(event) => set("cin", event.target.value)}
                  />
                </Field>
              </div>
            ) : (
              <Field label="Client" htmlFor="new-customer" required>
                <NativeSelect
                  id="new-customer"
                  value={form.customerId}
                  onChange={(event) => set("customerId", event.target.value)}
                >
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pièces d&apos;identité</CardTitle>
            <span className="text-[12.5px] text-navy-400">facultatif</span>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[13px] leading-relaxed text-navy-500">
              Photographiez la CIN et le permis du client. Les pièces sont
              rattachées à sa fiche : il n&apos;aura pas à les redonner lors
              d&apos;une prochaine location.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <FileField
                id="admin-cin"
                label="CIN ou passeport"
                hint="JPG, PNG ou PDF · 10 Mo maximum"
                chooseLabel="Choisir un fichier"
                replaceLabel="Remplacer"
                removeLabel="Retirer le fichier"
                onChange={setCinFile}
              />
              <FileField
                id="admin-license"
                label="Permis de conduire"
                hint="JPG, PNG ou PDF · 10 Mo maximum"
                chooseLabel="Choisir un fichier"
                replaceLabel="Remplacer"
                removeLabel="Retirer le fichier"
                onChange={setLicenseFile}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dossier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Origine de la demande" htmlFor="new-source">
              <NativeSelect
                id="new-source"
                value={form.source}
                onChange={(event) => set("source", event.target.value)}
              >
                {(["WALK_IN", "PHONE", "WHATSAPP", "ADMIN"] as const).map((value) => (
                  <option key={value} value={value}>
                    {RESERVATION_SOURCE[value]}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Note interne" htmlFor="new-notes">
              <Textarea
                id="new-notes"
                rows={2}
                value={form.internalNotes}
                onChange={(event) => set("internalNotes", event.target.value)}
              />
            </Field>

            <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-navy-700">
              <Checkbox
                checked={form.confirmImmediately}
                onChange={(event) => set("confirmImmediately", event.target.checked)}
              />
              Confirmer immédiatement (le véhicule est bloqué sur la période)
            </label>
          </CardContent>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Estimation</CardTitle>
          </CardHeader>
          <CardContent>
            {estimate ? (
              <dl className="space-y-2.5 text-[13.5px]">
                <div className="flex justify-between">
                  <dt className="text-navy-500">Durée</dt>
                  <dd className="font-medium text-navy-900">
                    {estimate.days} jour{estimate.days > 1 ? "s" : ""}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-navy-500">Tarif appliqué</dt>
                  <dd className="font-medium tabular-nums text-navy-900">
                    {formatMoney(estimate.rate)} / jour
                  </dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-navy-100 pt-2.5">
                  <dt className="font-semibold text-navy-900">Total</dt>
                  <dd className="font-[family-name:var(--font-display)] text-[20px] font-bold tabular-nums text-navy-950">
                    {formatMoney(estimate.total)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-[13px] text-navy-400">
                Choisissez un véhicule et des dates valides pour voir l&apos;estimation.
              </p>
            )}

            <p className="mt-4 text-[12px] leading-relaxed text-navy-400">
              Le montant définitif (saisons, remises longue durée) est recalculé
              par le serveur à l&apos;enregistrement.
            </p>

            <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Créer la réservation
            </Button>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
