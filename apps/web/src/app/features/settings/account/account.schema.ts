/**
 * Admin Settings — Account Feature (Web) — Zod Validation Schemas
 *
 * Field names for changeEmailSchema/changePasswordSchema mirror
 * better-auth's own client method signatures (authClient.changeEmail
 * takes `newEmail`; authClient.changePassword takes `currentPassword`/
 * `newPassword`) so form values can be passed straight through in
 * account.mutations.ts without remapping.
 *
 * @module features/settings/account/account.schema
 */
import { z } from 'zod'

export const updateNameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
})

export type UpdateNameFormValues = z.infer<typeof updateNameSchema>

export const changeEmailSchema = z.object({
  newEmail: z.string().min(1, 'Email is required').email('Enter a valid email'),
})

export type ChangeEmailFormValues = z.infer<typeof changeEmailSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
