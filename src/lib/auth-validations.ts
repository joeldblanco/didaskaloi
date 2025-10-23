import { z } from "zod";

// User authentication schemas
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[a-zA-Z]/, "La contraseña debe contener al menos una letra")
    .regex(/[0-9]/, "La contraseña debe contener al menos un número"),
});

// Project schemas
export const createProjectSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  password: z
    .string()
    .min(6, "La contraseña del proyecto debe tener al menos 6 caracteres"),
});

export const joinProjectSchema = z.object({
  accessCode: z.string().min(1, "El código de acceso es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const joinWithInviteSchema = z.object({
  inviteCode: z.string().min(1, "El código de invitación es requerido"),
  projectPassword: z.string().min(1, "La contraseña del proyecto es requerida"),
});

export const updateProjectSchema = z.object({
  id: z.number(),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
  password: z
    .string()
    .min(6, "La contraseña del proyecto debe tener al menos 6 caracteres")
    .optional(),
});

// Invite code schemas
export const createInviteCodeSchema = z.object({
  projectId: z.number(),
  role: z.enum(["EDITOR", "VIEWER"]),
  expiresAt: z.date().optional(),
  maxUses: z.number().positive().optional(),
});

export const updateMemberRoleSchema = z.object({
  projectId: z.number(),
  userId: z.number(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

export const removeMemberSchema = z.object({
  projectId: z.number(),
  userId: z.number(),
});

// Type exports
export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;
export type JoinProjectFormValues = z.infer<typeof joinProjectSchema>;
export type JoinWithInviteFormValues = z.infer<typeof joinWithInviteSchema>;
export type UpdateProjectFormValues = z.infer<typeof updateProjectSchema>;
export type CreateInviteCodeFormValues = z.infer<typeof createInviteCodeSchema>;
export type UpdateMemberRoleFormValues = z.infer<typeof updateMemberRoleSchema>;
export type RemoveMemberFormValues = z.infer<typeof removeMemberSchema>;
