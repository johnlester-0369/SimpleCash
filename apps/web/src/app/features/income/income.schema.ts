/**
 * Income Feature (Web) — Zod Validation Schemas
 * @module features/income/income.schema
 */
import { z } from 'zod'

export const incomeFormSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('one_time'),
    name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    receivedAt: z.string().optional(),
  }),
  z.object({
    type: z.literal('recurring'),
    name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    frequency: z.enum(['minute', 'hour', 'day', 'month', 'year']),
  }),
])
export type IncomeFormValues = z.infer<typeof incomeFormSchema>

// Edit dialog — one-time entries allow full editing; recurring entries
// are rendered read-only for amount/frequency in income.tsx, so this
// schema only needs to validate the fields that stay editable
export const editIncomeFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  receivedAt: z.string().optional(),
})
export type EditIncomeFormValues = z.infer<typeof editIncomeFormSchema>
