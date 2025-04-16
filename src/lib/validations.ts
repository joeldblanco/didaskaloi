import { z } from "zod";

export const classSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
});

export const studentSchema = z.object({
  id: z.number().optional(),
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z
    .string()
    .min(2, "Los apellidos deben tener al menos 2 caracteres"),
  gender: z.enum(["M", "F"], {
    required_error: "El género es obligatorio",
  }),
  age: z.coerce
    .number()
    .min(1, "La edad mínima es 1 año")
    .max(100, "La edad máxima es 100 años"),
  classId: z.coerce.number({
    required_error: "La clase es obligatoria",
  }),
});

export const ageRangeSchema = z
  .object({
    id: z.number().optional(),
    label: z.string().min(3, "La etiqueta debe tener al menos 3 caracteres"),
    minAge: z.coerce.number().min(1, "La edad mínima es 1 año"),
    maxAge: z.coerce.number().max(100, "La edad máxima es 100 años"),
  })
  .refine((data) => data.minAge <= data.maxAge, {
    message: "La edad mínima debe ser menor o igual a la edad máxima",
    path: ["maxAge"],
  });

export const attendanceSchema = z.object({
  id: z.number().optional(),
  date: z.date({
    required_error: "La fecha es obligatoria",
  }),
  classId: z.coerce.number({
    required_error: "La clase es obligatoria",
  }),
});

export const attendanceRecordSchema = z.object({
  id: z.number().optional(),
  studentId: z.number(),
  attendanceId: z.number(),
  present: z.boolean(),
});

export type ClassFormValues = z.infer<typeof classSchema>;
export type StudentFormValues = z.infer<typeof studentSchema>;
export type AgeRangeFormValues = z.infer<typeof ageRangeSchema>;
export type AttendanceFormValues = z.infer<typeof attendanceSchema>;
export type AttendanceRecordFormValues = z.infer<typeof attendanceRecordSchema>;
