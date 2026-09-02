import { toUnits } from "@/lib/money";

/**
 * Forme des données du formulaire véhicule, et conversion depuis la base.
 *
 * Ce module ne porte PAS la directive "use client" : la page de modification
 * est un composant serveur et doit pouvoir appeler `toFormValues()`. Une
 * fonction exportée depuis un module client ne peut pas être invoquée côté
 * serveur — seulement rendue comme composant ou passée en props.
 */
export type VehicleFormValues = {
  id?: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color: string;
  category: string;
  transmission: string;
  fuel: string;
  seats: number;
  doors: number;
  hasAirConditioning: boolean;
  mileage: number;
  dailyRate: number;
  rate3Days: number | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
  minRentalDays: number;
  status: string;
  isFeatured: boolean;
  descriptionFr: string;
  descriptionEn: string;
  descriptionAr: string;
  features: string[];
  purchaseDate: string;
  insuranceProvider: string;
  insuranceExpiry: string;
  technicalInspectionExpiry: string;
  oilChangeIntervalKm: number;
  lastOilChangeMileage: number | null;
  lastOilChangeDate: string;
  internalNotes: string;
};

export const EMPTY_VEHICLE: VehicleFormValues = {
  brand: "",
  model: "",
  year: new Date().getFullYear(),
  plate: "",
  color: "",
  category: "ECONOMIQUE",
  transmission: "MANUAL",
  fuel: "DIESEL",
  seats: 5,
  doors: 5,
  hasAirConditioning: true,
  mileage: 0,
  dailyRate: 0,
  rate3Days: null,
  weeklyRate: null,
  monthlyRate: null,
  minRentalDays: 1,
  status: "AVAILABLE",
  isFeatured: false,
  descriptionFr: "",
  descriptionEn: "",
  descriptionAr: "",
  features: [],
  purchaseDate: "",
  insuranceProvider: "",
  insuranceExpiry: "",
  technicalInspectionExpiry: "",
  oilChangeIntervalKm: 10000,
  lastOilChangeMileage: null,
  lastOilChangeDate: "",
  internalNotes: "",
};

/** Convertit une ligne de base en valeurs de formulaire (centimes -> dirhams). */
export function toFormValues(vehicle: {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color: string | null;
  category: string;
  transmission: string;
  fuel: string;
  seats: number;
  doors: number;
  hasAirConditioning: boolean;
  mileage: number;
  dailyRate: number;
  rate3Days: number | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
  minRentalDays: number;
  status: string;
  isFeatured: boolean;
  descriptionFr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  features: string[];
  purchaseDate: Date | null;
  insuranceProvider: string | null;
  insuranceExpiry: Date | null;
  technicalInspectionExpiry: Date | null;
  oilChangeIntervalKm: number;
  lastOilChangeMileage: number | null;
  lastOilChangeDate: Date | null;
  internalNotes: string | null;
}): VehicleFormValues {
  const asDate = (value: Date | null) =>
    value ? value.toISOString().slice(0, 10) : "";

  return {
    id: vehicle.id,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    plate: vehicle.plate,
    color: vehicle.color ?? "",
    category: vehicle.category,
    transmission: vehicle.transmission,
    fuel: vehicle.fuel,
    seats: vehicle.seats,
    doors: vehicle.doors,
    hasAirConditioning: vehicle.hasAirConditioning,
    mileage: vehicle.mileage,
    dailyRate: toUnits(vehicle.dailyRate),
    rate3Days: vehicle.rate3Days != null ? toUnits(vehicle.rate3Days) : null,
    weeklyRate: vehicle.weeklyRate != null ? toUnits(vehicle.weeklyRate) : null,
    monthlyRate: vehicle.monthlyRate != null ? toUnits(vehicle.monthlyRate) : null,
    minRentalDays: vehicle.minRentalDays,
    status: vehicle.status,
    isFeatured: vehicle.isFeatured,
    descriptionFr: vehicle.descriptionFr ?? "",
    descriptionEn: vehicle.descriptionEn ?? "",
    descriptionAr: vehicle.descriptionAr ?? "",
    features: vehicle.features,
    purchaseDate: asDate(vehicle.purchaseDate),
    insuranceProvider: vehicle.insuranceProvider ?? "",
    insuranceExpiry: asDate(vehicle.insuranceExpiry),
    technicalInspectionExpiry: asDate(vehicle.technicalInspectionExpiry),
    oilChangeIntervalKm: vehicle.oilChangeIntervalKm,
    lastOilChangeMileage: vehicle.lastOilChangeMileage,
    lastOilChangeDate: asDate(vehicle.lastOilChangeDate),
    internalNotes: vehicle.internalNotes ?? "",
  };
}
