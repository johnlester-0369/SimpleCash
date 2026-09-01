/**
 * Expenses Feature — Zod Validation Schemas
 * @module app/features/expenses/expense.schema
 */
import { z } from 'zod'

const oneTimeExpenseSchema = z.object({
  type: z.literal('one_time'),
  name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  purchasedAt: z.coerce.date().optional(),
})

const recurringExpenseSchema = z.object({
  type: z.literal('recurring'),
  name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  frequency: z.enum(['minute', 'hour', 'day', 'month', 'year']),
})

export const createExpenseSchema = z.discriminatedUnion('type', [
  oneTimeExpenseSchema,
  recurringExpenseSchema,
])

// PUT /expenses/:id — accepts a superset of both branches' editable
// fields; expense.service.ts rejects amount/purchasedAt edits on
// recurring rows since that decision needs the existing row's `type`
export const updateExpenseSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    amount: z.coerce.number().positive().optional(),
    purchasedAt: z.coerce.date().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export const expenseIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listExpenseQuerySchema = z.object({
  search: z.string().optional(),
  type: z.enum(['one_time', 'recurring']).optional(),
})
