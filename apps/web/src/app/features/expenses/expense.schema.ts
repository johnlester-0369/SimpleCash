/**
 * Expenses Feature (Web) — Zod Validation Schemas
 * @module features/expenses/expense.schema
 */
import { z } from 'zod'

export const expenseFormSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('one_time'),
    name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    purchasedAt: z.string().optional(),
  }),
  z.object({
    type: z.literal('recurring'),
    name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    frequency: z.enum(['minute', 'hour', 'day', 'month', 'year']),
  }),
])
export type ExpenseFormValues = z.infer<typeof expenseFormSchema>

// Edit dialog — one-time entries allow full editing; recurring entries
// are rendered read-only for amount/frequency in expenses.tsx, so this
// schema only needs to validate the fields that stay editable
export const editExpenseFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  purchasedAt: z.string().optional(),
})
export type EditExpenseFormValues = z.infer<typeof editExpenseFormSchema>
