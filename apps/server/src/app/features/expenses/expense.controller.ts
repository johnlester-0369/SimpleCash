/**
 * Expenses Feature — Controller
 * @module app/features/expenses/expense.controller
 */
import type { Request, Response } from 'express'
import { asyncHandler } from '@/app/middleware/error-handler.middleware.js'
import { expenseService } from './expense.service.js'
import { toExpenseResponse, toExpenseResponseList } from './expense.mapper.js'
import {
  createExpenseSchema,
  expenseIdParamSchema,
  listExpenseQuerySchema,
  updateExpenseSchema,
} from './expense.schema.js'

export const listExpenses = asyncHandler(
  async (req: Request, res: Response) => {
    const query = listExpenseQuerySchema.parse(req.query)
    const items = await expenseService.listExpenses(query)
    res.json({ data: toExpenseResponseList(items) })
  },
)

export const getExpense = asyncHandler(async (req: Request, res: Response) => {
  const { id } = expenseIdParamSchema.parse(req.params)
  const found = await expenseService.getExpense(id)
  res.json({ data: toExpenseResponse(found) })
})

export const createExpense = asyncHandler(
  async (req: Request, res: Response) => {
    const input = createExpenseSchema.parse(req.body)
    // Zod coerces amount/purchasedAt for validation; the service layer
    // expects amount as a string and purchasedAt as an ISO string —
    // same boundary conversion as income.controller.ts
    const created = await expenseService.createExpense({
      name: input.name,
      amount: String(input.amount),
      type: input.type,
      ...(input.type === 'recurring'
        ? { frequency: input.frequency }
        : { purchasedAt: input.purchasedAt?.toISOString() }),
    })
    res.status(201).json({ data: toExpenseResponse(created) })
  },
)

export const updateExpense = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = expenseIdParamSchema.parse(req.params)
    const input = updateExpenseSchema.parse(req.body)
    const updated = await expenseService.updateExpense(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.amount !== undefined ? { amount: String(input.amount) } : {}),
      ...(input.purchasedAt !== undefined
        ? { purchasedAt: input.purchasedAt.toISOString() }
        : {}),
    })
    res.json({ data: toExpenseResponse(updated) })
  },
)

export const deleteExpense = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = expenseIdParamSchema.parse(req.params)
    await expenseService.deleteExpense(id)
    res.status(204).send()
  },
)

export const cancelExpense = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = expenseIdParamSchema.parse(req.params)
    const updated = await expenseService.cancelExpense(id)
    res.json({ data: toExpenseResponse(updated) })
  },
)

export const reactivateExpense = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = expenseIdParamSchema.parse(req.params)
    const updated = await expenseService.reactivateExpense(id)
    res.json({ data: toExpenseResponse(updated) })
  },
)
