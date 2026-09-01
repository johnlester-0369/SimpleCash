/**
 * Auth Feature (Web) — Zod Validation Schemas
 *
 * Mirrors what Better Auth's client actually requires: signIn.email needs
 * email + password, signUp.email additionally needs `name` since
 * user.name is NOT NULL in the server's auth.schema.ts. No password
 * complexity rules are enforced here beyond a length floor — the real
 * credential check always happens server-side.
 *
 * @module features/auth/auth.schema
 */
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type SignupFormValues = z.infer<typeof signupSchema>
