/**
 * Income Feature — Zod Validation Schemas
 * @module app/features/income/income.schema
 */
import { z } from 'zod'

const oneTimeIncomeSchema = z.object({
  type: z.literal('one_time'),
  name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  receivedAt: z.coerce.date().optional(),
})

const recurringIncomeSchema = z.object({
  type: z.literal('recurring'),
  name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  frequency: z.enum(['minute', 'hour', 'day', 'month', 'year']),
})

export const createIncomeSchema = z.discriminatedUnion('type', [
  oneTimeIncomeSchema,
  recurringIncomeSchema,
])

// PUT /income/:id — accepts a superset of both branches' editable fields;
// income.service.ts rejects amount/receivedAt edits on recurring rows
// since that decision needs the existing row's `type`, which Zod alone
// (schema-only, no DB access) can't see.
export const updateIncomeSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    amount: z.coerce.number().positive().optional(),
    receivedAt: z.coerce.date().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export const incomeIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listIncomeQuerySchema = z.object({
  search: z.string().optional(),
  type: z.enum(['one_time', 'recurring']).optional(),
})
