"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Loader2, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import {
  FUEL,
  TRANSMISSION,
  VEHICLE_CATEGORY,
  VEHICLE_STATUS,
} from "@/lib/labels";
import {
  VEHICLE_BRANDS,
  VEHICLE_COLORS,
  modelsForBrand,
} from "@/config/vehicle-options";
import type { VehicleFormValues } from "@/lib/vehicle-form-values";
import { createVehicle, updateVehicle } from "@/server/actions/vehicles";

/**
 * Formulaire de véhicule (création et modification).
 *
 * Les montants sont saisis en dirhams — la conversion en centimes se fait
 * côté serveur, pour que l'employé n'ait jamais à y penser.
 */
export function VehicleForm({
  initialValues,
  mode,
  fleetSuggestions,
}: {
  initialValues: VehicleFormValues;
  mode: "create" | "edit";
  /** Marques, modèles et couleurs déjà présents dans la flotte de l'agence. */
  fleetSuggestions?: {
    brands: string[];
    modelsByBrand: Record<string, string[]>;
    colors: string[];
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState(initialValues);
  const [featureDraft, setFeatureDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /*
   * Suggestions de saisie : le référentiel du marché marocain, enrichi de ce
   * que l'agence a déjà enregistré. Les champs restent libres — une marque
   * absente de la liste peut toujours être tapée.
   */
  const brandOptions = mergeOptions(
    VEHICLE_BRANDS,
    fleetSuggestions?.brands ?? [],
  );
  // Modèles de la marque saisie uniquement : proposer « Duster » alors que
  // l'utilisateur a tapé « Renault » ne l'aiderait pas.
  const modelOptions = mergeOptions(
    modelsForBrand(values.brand),
    fleetSuggestions?.modelsByBrand?.[values.brand.trim().toLowerCase()] ?? [],
  );
  const colorOptions = mergeOptions(
    VEHICLE_COLORS,
    fleetSuggestions?.colors ?? [],
  );

  function set<K extends keyof VehicleFormValues>(
    key: K,
    value: VehicleFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function addFeature() {
    const feature = featureDraft.trim();
    if (!feature || values.features.includes(feature)) return;
    set("features", [...values.features, feature]);
    setFeatureDraft("");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const payload = {
        ...values,
        rate3Days: values.rate3Days ?? "",
        weeklyRate: values.weeklyRate ?? "",
        monthlyRate: values.monthlyRate ?? "",
        lastOilChangeMileage: values.lastOilChangeMileage ?? null,
      };

      const result =
        mode === "create"
          ? await createVehicle(payload)
          : await updateVehicle(initialValues.id!, payload);

      if (result.ok) {
        toast.success(
          mode === "create"
            ? "Véhicule ajouté. Il ne manque plus que les photos."
            : "Véhicule mis à jour.",
        );
        const id = result.data?.id ?? initialValues.id;
        // À la création, on amène l'utilisateur droit sur la zone de photos.
        router.push(
          mode === "create"
            ? `/admin/vehicules/${id}?nouveau=1#photos`
            : `/admin/vehicules/${id}`,
        );
        router.refresh();
        return;
      }

      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      window.scrollTo({ top: 0, behavior: "smooth" });
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

      {/* ---------------------- Identification ---------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Identification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Marque"
            htmlFor="brand"
            required
            error={fieldErrors.brand}
            hint="choisissez dans la liste ou saisissez librement"
          >
            <Input
              id="brand"
              list="brand-options"
              value={values.brand}
              onChange={(event) => set("brand", event.target.value)}
              placeholder="Renault"
              autoComplete="off"
              required
            />
            <datalist id="brand-options">
              {brandOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </Field>
          <Field label="Modèle" htmlFor="model" required error={fieldErrors.model}>
            <Input
              id="model"
              list="model-options"
              value={values.model}
              onChange={(event) => set("model", event.target.value)}
              placeholder="Clio 5"
              autoComplete="off"
              required
            />
            {/* La liste se restreint aux modèles de la marque saisie. */}
            <datalist id="model-options">
              {modelOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </Field>
          <Field label="Année" htmlFor="year" required error={fieldErrors.year}>
            <Input
              id="year"
              type="number"
              value={values.year}
              onChange={(event) => set("year", Number(event.target.value))}
              required
            />
          </Field>
          <Field
            label="Immatriculation"
            htmlFor="plate"
            required
            error={fieldErrors.plate}
            hint="12345-A-6"
          >
            <Input
              id="plate"
              value={values.plate}
              onChange={(event) => set("plate", event.target.value)}
              className="font-mono uppercase"
              required
            />
          </Field>
          <Field label="Couleur" htmlFor="color">
            <Input
              id="color"
              list="color-options"
              value={values.color}
              onChange={(event) => set("color", event.target.value)}
              placeholder="Gris métallisé"
              autoComplete="off"
            />
            <datalist id="color-options">
              {colorOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </Field>
          <Field label="Kilométrage actuel" htmlFor="mileage" required>
            <Input
              id="mileage"
              type="number"
              min={0}
              value={values.mileage}
              onChange={(event) => set("mileage", Number(event.target.value))}
              required
            />
          </Field>
        </CardContent>
      </Card>

      {/* ---------------------- Caractéristiques ---------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Caractéristiques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Catégorie" htmlFor="category">
              <NativeSelect
                id="category"
                value={values.category}
                onChange={(event) => set("category", event.target.value)}
              >
                {Object.entries(VEHICLE_CATEGORY).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Transmission" htmlFor="transmission">
              <NativeSelect
                id="transmission"
                value={values.transmission}
                onChange={(event) => set("transmission", event.target.value)}
              >
                {Object.entries(TRANSMISSION).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Carburant" htmlFor="fuel">
              <NativeSelect
                id="fuel"
                value={values.fuel}
                onChange={(event) => set("fuel", event.target.value)}
              >
                {Object.entries(FUEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Nombre de places" htmlFor="seats">
              <Input
                id="seats"
                type="number"
                min={1}
                max={9}
                value={values.seats}
                onChange={(event) => set("seats", Number(event.target.value))}
              />
            </Field>
            <Field label="Nombre de portes" htmlFor="doors">
              <Input
                id="doors"
                type="number"
                min={2}
                max={6}
                value={values.doors}
                onChange={(event) => set("doors", Number(event.target.value))}
              />
            </Field>
            <Field label="Statut" htmlFor="status">
              <NativeSelect
                id="status"
                value={values.status}
                onChange={(event) => set("status", event.target.value)}
              >
                {Object.entries(VEHICLE_STATUS).map(([value, entry]) => (
                  <option key={value} value={value}>
                    {entry.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <div className="flex flex-wrap gap-6 pt-1">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-navy-700">
              <Checkbox
                checked={values.hasAirConditioning}
                onChange={(event) => set("hasAirConditioning", event.target.checked)}
              />
              Climatisation
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-navy-700">
              <Checkbox
                checked={values.isFeatured}
                onChange={(event) => set("isFeatured", event.target.checked)}
              />
              Mettre en avant sur le site
            </label>
          </div>

          {/* Équipements */}
          <Field label="Équipements" htmlFor="feature-draft">
            <div className="flex gap-2">
              <Input
                id="feature-draft"
                value={featureDraft}
                onChange={(event) => setFeatureDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addFeature();
                  }
                }}
                placeholder="GPS, Bluetooth, caméra de recul…"
              />
              <Button type="button" variant="outline" onClick={addFeature}>
                <Plus className="size-4" />
                Ajouter
              </Button>
            </div>
          </Field>

          {values.features.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {values.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-1.5 rounded-full bg-navy-50 py-1 pe-1.5 ps-3 text-[12.5px] text-navy-700"
                >
                  {feature}
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "features",
                        values.features.filter((item) => item !== feature),
                      )
                    }
                    className="rounded-full p-0.5 text-navy-400 hover:bg-navy-200 hover:text-navy-700"
                    aria-label={`Retirer ${feature}`}
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      {/* ---------------------- Tarifs ---------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Tarifs (en dirhams, par jour)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Tarif journalier"
            htmlFor="dailyRate"
            required
            error={fieldErrors.dailyRate}
          >
            <Input
              id="dailyRate"
              type="number"
              min={0}
              step="0.01"
              value={values.dailyRate}
              onChange={(event) => set("dailyRate", Number(event.target.value))}
              required
            />
          </Field>
          <Field label="À partir de 3 jours" htmlFor="rate3Days" hint="facultatif">
            <Input
              id="rate3Days"
              type="number"
              min={0}
              step="0.01"
              value={values.rate3Days ?? ""}
              onChange={(event) =>
                set("rate3Days", event.target.value ? Number(event.target.value) : null)
              }
            />
          </Field>
          <Field label="À partir de 7 jours" htmlFor="weeklyRate" hint="facultatif">
            <Input
              id="weeklyRate"
              type="number"
              min={0}
              step="0.01"
              value={values.weeklyRate ?? ""}
              onChange={(event) =>
                set("weeklyRate", event.target.value ? Number(event.target.value) : null)
              }
            />
          </Field>
          <Field label="À partir de 30 jours" htmlFor="monthlyRate" hint="facultatif">
            <Input
              id="monthlyRate"
              type="number"
              min={0}
              step="0.01"
              value={values.monthlyRate ?? ""}
              onChange={(event) =>
                set("monthlyRate", event.target.value ? Number(event.target.value) : null)
              }
            />
          </Field>
          <Field label="Durée minimale (jours)" htmlFor="minRentalDays">
            <Input
              id="minRentalDays"
              type="number"
              min={1}
              max={30}
              value={values.minRentalDays}
              onChange={(event) => set("minRentalDays", Number(event.target.value))}
            />
          </Field>
        </CardContent>
      </Card>

      {/* ---------------------- Administratif ---------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Administratif et entretien</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Date d'achat" htmlFor="purchaseDate">
            <Input
              id="purchaseDate"
              type="date"
              value={values.purchaseDate}
              onChange={(event) => set("purchaseDate", event.target.value)}
            />
          </Field>
          <Field label="Compagnie d'assurance" htmlFor="insuranceProvider">
            <Input
              id="insuranceProvider"
              value={values.insuranceProvider}
              onChange={(event) => set("insuranceProvider", event.target.value)}
            />
          </Field>
          <Field label="Expiration de l'assurance" htmlFor="insuranceExpiry">
            <Input
              id="insuranceExpiry"
              type="date"
              value={values.insuranceExpiry}
              onChange={(event) => set("insuranceExpiry", event.target.value)}
            />
          </Field>
          <Field
            label="Expiration visite technique"
            htmlFor="technicalInspectionExpiry"
          >
            <Input
              id="technicalInspectionExpiry"
              type="date"
              value={values.technicalInspectionExpiry}
              onChange={(event) =>
                set("technicalInspectionExpiry", event.target.value)
              }
            />
          </Field>
          <Field
            label="Intervalle de vidange (km)"
            htmlFor="oilChangeIntervalKm"
            hint="10 000 km par défaut"
          >
            <Input
              id="oilChangeIntervalKm"
              type="number"
              min={1000}
              step={500}
              value={values.oilChangeIntervalKm}
              onChange={(event) =>
                set("oilChangeIntervalKm", Number(event.target.value))
              }
            />
          </Field>
          <Field
            label="Km à la dernière vidange"
            htmlFor="lastOilChangeMileage"
            hint="détermine la prochaine échéance"
          >
            <Input
              id="lastOilChangeMileage"
              type="number"
              min={0}
              value={values.lastOilChangeMileage ?? ""}
              onChange={(event) =>
                set(
                  "lastOilChangeMileage",
                  event.target.value ? Number(event.target.value) : null,
                )
              }
            />
          </Field>
          <Field label="Date de la dernière vidange" htmlFor="lastOilChangeDate">
            <Input
              id="lastOilChangeDate"
              type="date"
              value={values.lastOilChangeDate}
              onChange={(event) => set("lastOilChangeDate", event.target.value)}
            />
          </Field>

          {values.lastOilChangeMileage != null ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="rounded-lg bg-teal-50/70 px-3.5 py-2.5 text-[12.5px] text-teal-900">
                Prochaine vidange calculée à{" "}
                <strong>
                  {(
                    values.lastOilChangeMileage + values.oilChangeIntervalKm
                  ).toLocaleString("fr-MA")}{" "}
                  km
                </strong>{" "}
                — soit dans{" "}
                {(
                  values.lastOilChangeMileage +
                  values.oilChangeIntervalKm -
                  values.mileage
                ).toLocaleString("fr-MA")}{" "}
                km.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ---------------------- Descriptions ---------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Descriptions affichées sur le site</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Français" htmlFor="descriptionFr">
            <Textarea
              id="descriptionFr"
              rows={3}
              value={values.descriptionFr}
              onChange={(event) => set("descriptionFr", event.target.value)}
            />
          </Field>
          <Field label="Anglais" htmlFor="descriptionEn">
            <Textarea
              id="descriptionEn"
              rows={3}
              value={values.descriptionEn}
              onChange={(event) => set("descriptionEn", event.target.value)}
            />
          </Field>
          <Field label="Arabe" htmlFor="descriptionAr">
            <Textarea
              id="descriptionAr"
              rows={3}
              dir="rtl"
              value={values.descriptionAr}
              onChange={(event) => set("descriptionAr", event.target.value)}
            />
          </Field>
          <Field label="Notes internes" htmlFor="internalNotes" hint="jamais publiées">
            <Textarea
              id="internalNotes"
              rows={2}
              value={values.internalNotes}
              onChange={(event) => set("internalNotes", event.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2.5">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {mode === "create" ? "Ajouter le véhicule" : "Enregistrer les modifications"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Fusionne le référentiel et ce que l'agence a déjà saisi, sans doublon et
 * sans tenir compte de la casse.
 */
function mergeOptions(reference: string[], existing: string[]): string[] {
  const seen = new Map<string, string>();
  for (const value of [...existing, ...reference]) {
    const key = value.trim().toLowerCase();
    if (key && !seen.has(key)) seen.set(key, value.trim());
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "fr"));
}
