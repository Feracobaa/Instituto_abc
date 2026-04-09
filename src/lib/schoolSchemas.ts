import { z } from "zod";

const phonePattern = /^[0-9()+\-\s]{7,20}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const optionalPhoneField = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || phonePattern.test(value), {
    message: "Ingresa un telefono valido o deja el campo vacio.",
  });

export const teacherFormSchema = z.object({
  email: z.string().trim().email("Ingresa un correo electronico valido."),
  full_name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres."),
  grade_ids: z.array(z.string()).min(1, "Selecciona al menos un grado."),
  phone: optionalPhoneField,
  subject_ids: z.array(z.string()).min(1, "Selecciona al menos una materia."),
});

export const studentFormSchema = z.object({
  full_name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres."),
  grade_id: z.string().trim().min(1, "Selecciona un grado."),
  guardian_name: z.string().trim().optional(),
  guardian_phone: optionalPhoneField,
});

export const subjectFormSchema = z.object({
  color: z.string().trim().min(1, "Selecciona un color."),
  grade_level: z.string().trim(),
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  parent_id: z.string().trim(),
});

export const scheduleFormSchema = z
  .object({
    endTime: z
      .string()
      .trim()
      .regex(timePattern, "La hora de fin debe tener formato HH:mm."),
    isRoutine: z.boolean(),
    startTime: z
      .string()
      .trim()
      .regex(timePattern, "La hora de inicio debe tener formato HH:mm."),
    subjectId: z.string().trim(),
    teacherId: z.string().trim(),
    title: z.string().trim(),
  })
  .superRefine((value, context) => {
    if (value.endTime <= value.startTime) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La hora de fin debe ser posterior a la hora de inicio.",
        path: ["endTime"],
      });
    }

    if (value.isRoutine) {
      if (!value.title) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Escribe un titulo para la rutina.",
          path: ["title"],
        });
      }
      return;
    }

    if (!value.subjectId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona una materia.",
        path: ["subjectId"],
      });
    }

    if (!value.teacherId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona un docente.",
        path: ["teacherId"],
      });
    }
  });

export function getFieldErrors(error: z.ZodError) {
  const fieldErrors = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([, value]) => Boolean(value?.length))
      .map(([key, value]) => [key, value?.[0] ?? "Campo invalido."]),
  ) as Record<string, string>;
}
