import { z } from "zod";

/**
 * Schémas de validation partagés client / serveur.
 *
 * Le formulaire les utilise pour l'affichage des erreurs, mais la validation
 * qui fait foi est celle exécutée dans la server action : on ne fait jamais
 * confiance aux données envoyées par le navigateur.
 */

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");
const TIME = z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide");

/** Numéros marocains et internationaux : +212 6 12 34 56 78, 0612345678, +33… */
const PHONE = z
  .string()
  .trim()
  .min(9, "Numéro de téléphone trop court")
  .max(20, "Numéro de téléphone trop long")
  .regex(
    /^[+]?[0-9\s().-]{9,20}$/,
    "Numéro de téléphone invalide (ex. +212 6 61 80 58 08)",
  );

export const periodSchema = z.object({
  startDate: DATE,
  startTime: TIME,
  endDate: DATE,
  endTime: TIME,
});

export const quoteInputSchema = periodSchema.extend({
  vehicleId: z.string().min(1),
  pickupLocationId: z.string().optional().nullable(),
  dropoffLocationId: z.string().optional().nullable(),
});

export const createReservationSchema = quoteInputSchema.extend({
  /**
   * Adresse saisie librement par le client, quand aucun lieu enregistré ne
   * convient. Elle prime alors sur le libellé du lieu.
   */
  pickupLocationText: z.string().trim().max(120).optional().or(z.literal("")),
  dropoffLocationText: z.string().trim().max(120).optional().or(z.literal("")),
  firstName: z
    .string()
    .trim()
    .min(2, "Le prénom est obligatoire")
    .max(60, "Prénom trop long"),
  lastName: z
    .string()
    .trim()
    .min(2, "Le nom est obligatoire")
    .max(60, "Nom trop long"),
  phone: PHONE,
  email: z
    .string()
    .trim()
    .email("Adresse email invalide")
    .max(120)
    .optional()
    .or(z.literal("")),
  cin: z
    .string()
    .trim()
    .max(40, "Numéro trop long")
    .optional()
    .or(z.literal("")),
  licenseNumber: z
    .string()
    .trim()
    .max(40, "Numéro trop long")
    .optional()
    .or(z.literal("")),
  country: z.string().trim().max(60).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
  acceptTerms: z
    .boolean()
    .refine((value) => value, "Vous devez accepter les conditions de location."),
  /** Champ piège anti-robot : rempli uniquement par les bots. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type QuoteInput = z.infer<typeof quoteInputSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Votre nom est obligatoire").max(80),
  phone: PHONE,
  email: z
    .string()
    .trim()
    .email("Adresse email invalide")
    .max(120)
    .optional()
    .or(z.literal("")),
  subject: z.string().trim().min(2, "Le sujet est obligatoire").max(120),
  message: z
    .string()
    .trim()
    .min(10, "Votre message doit contenir au moins 10 caractères")
    .max(2000),
  website: z.string().max(0).optional().or(z.literal("")),
});

export type ContactInput = z.infer<typeof contactSchema>;
