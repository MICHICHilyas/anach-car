import { z } from "zod";
import {
  FuelType,
  Transmission,
  VehicleCategory,
  VehicleStatus,
} from "@/generated/prisma/enums";

/** Champ monétaire saisi en dirhams, converti en centimes côté serveur. */
const money = z
  .union([z.string(), z.number()])
  .transform((value) => (value === "" || value == null ? null : Number(value)))
  .refine((value) => value == null || (!Number.isNaN(value) && value >= 0), {
    message: "Montant invalide",
  });

const optionalDate = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? new Date(value) : null))
  .refine((value) => value == null || !Number.isNaN(value.getTime()), {
    message: "Date invalide",
  });

export const vehicleSchema = z.object({
  brand: z.string().trim().min(1, "La marque est obligatoire").max(40),
  model: z.string().trim().min(1, "Le modèle est obligatoire").max(60),
  year: z.coerce
    .number()
    .int()
    .min(1990, "Année invalide")
    .max(new Date().getFullYear() + 1, "Année invalide"),
  plate: z.string().trim().min(3, "L'immatriculation est obligatoire").max(20),
  color: z.string().trim().max(30).optional().or(z.literal("")),

  category: z.nativeEnum(VehicleCategory),
  transmission: z.nativeEnum(Transmission),
  fuel: z.nativeEnum(FuelType),
  seats: z.coerce.number().int().min(1).max(9),
  doors: z.coerce.number().int().min(2).max(6),
  hasAirConditioning: z.coerce.boolean().default(true),
  mileage: z.coerce.number().int().min(0, "Kilométrage invalide"),

  dailyRate: z.coerce.number().min(1, "Le tarif journalier est obligatoire"),
  rate3Days: money.nullable(),
  weeklyRate: money.nullable(),
  monthlyRate: money.nullable(),
  minRentalDays: z.coerce.number().int().min(1).max(30).default(1),

  status: z.nativeEnum(VehicleStatus).default(VehicleStatus.AVAILABLE),
  isFeatured: z.coerce.boolean().default(false),

  descriptionFr: z.string().trim().max(1500).optional().or(z.literal("")),
  descriptionEn: z.string().trim().max(1500).optional().or(z.literal("")),
  descriptionAr: z.string().trim().max(1500).optional().or(z.literal("")),
  features: z.array(z.string().trim().max(60)).max(30).default([]),

  purchaseDate: optionalDate,
  insuranceProvider: z.string().trim().max(80).optional().or(z.literal("")),
  insuranceExpiry: optionalDate,
  technicalInspectionExpiry: optionalDate,

  oilChangeIntervalKm: z.coerce.number().int().min(1000).max(50000).default(10000),
  lastOilChangeMileage: z.coerce.number().int().min(0).optional().nullable(),
  lastOilChangeDate: optionalDate,

  internalNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type VehicleInput = z.input<typeof vehicleSchema>;
export type VehicleParsed = z.output<typeof vehicleSchema>;
