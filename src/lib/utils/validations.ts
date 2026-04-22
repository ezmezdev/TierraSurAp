import { z } from 'zod'

// ============================================================
// SCHEMAS DE VALIDACIÓN
// Usados en frontend (UX) y backend (seguridad).
// El backend SIEMPRE revalida — el frontend es solo UX.
// ============================================================

export const registerSchema = z
  .object({
    display_name: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100, 'El nombre es demasiado largo')
      .trim(),
    email: z.string().email('Email inválido').toLowerCase().trim(),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirm_password: z.string(),
    phone: z
      .string()
      .regex(/^[\d\s\+\-\(\)]+$/, 'Teléfono inválido')
      .optional()
      .or(z.literal('')),
    terms_accepted: z.literal(true, {
      errorMap: () => ({ message: 'Debes aceptar los términos y condiciones' }),
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  })

export const loginSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
  password: z.string().min(1, 'Ingresá tu contraseña'),
})

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Ingresá tu contraseña actual'),
    new_password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirm_new_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_new_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_new_password'],
  })

export const createAdSchema = z.object({
  title: z
    .string()
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(120, 'El título es demasiado largo')
    .trim(),
  description: z
    .string()
    .min(20, 'La descripción debe tener al menos 20 caracteres')
    .max(2000, 'La descripción es demasiado larga')
    .trim(),
  ad_type: z.enum(['sale', 'rent', 'service', 'other'], {
    errorMap: () => ({ message: 'Seleccioná un tipo de anuncio' }),
  }),
  lot_id: z.string().uuid('Seleccioná un lote válido'),
  plan_id: z.string().uuid('Seleccioná un plan válido'),
  asking_price: z
    .number()
    .positive('El precio debe ser positivo')
    .optional()
    .or(z.nan().transform(() => undefined)),
  currency: z.string().default('ARS'),
})

export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100)
    .trim(),
  phone: z
    .string()
    .regex(/^[\d\s\+\-\(\)]+$/, 'Teléfono inválido')
    .optional()
    .or(z.literal('')),
})

// Tipos inferidos para uso en componentes
export type RegisterFormData = z.infer<typeof registerSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type CreateAdFormData = z.infer<typeof createAdSchema>
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
