import { z } from "zod";
import { UserRole } from "@/generated/prisma/enums";

/**
 * Comptes du personnel de l'agence.
 *
 * Le mot de passe est saisi par l'administrateur puis communiqué à
 * l'employé. Pas de lien d'invitation par email : l'agence n'a pas
 * forcément de service d'envoi configuré, et une adresse mal saisie
 * bloquerait la création du compte.
 */
const password = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .max(100, "Mot de passe trop long");

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Le nom est obligatoire").max(80),
  email: z.string().trim().toLowerCase().email("Adresse email invalide").max(120),
  role: z.nativeEnum(UserRole),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  password,
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, "Le nom est obligatoire").max(80),
  email: z.string().trim().toLowerCase().email("Adresse email invalide").max(120),
  role: z.nativeEnum(UserRole),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  password,
});

/**
 * Changement de son propre mot de passe.
 *
 * Le mot de passe actuel est exigé : sans lui, une session laissée ouverte
 * sur un poste de l'agence suffirait à s'approprier le compte. La
 * confirmation évite qu'une faute de frappe enferme quelqu'un dehors.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel obligatoire"),
    password,
    confirmPassword: z.string().min(1, "Confirmation obligatoire"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les deux mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  })
  .refine((d) => d.password !== d.currentPassword, {
    message: "Le nouveau mot de passe doit être différent de l'actuel",
    path: ["password"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
