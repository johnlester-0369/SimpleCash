/**
 * Income Feature — Controller
 * @module app/features/income/income.controller
 */
import type { Request, Response } from 'express'
import { asyncHandler } from '@/app/middleware/error-handler.middleware.js'
import { incomeService } from './income.service.js'
import { toIncomeResponse, toIncomeResponseList } from './income.mapper.js'
import {
  createIncomeSchema,
  incomeIdParamSchema,
  listIncomeQuerySchema,
  updateIncomeSchema,
} from './income.schema.js'

export const listIncome = asyncHandler(async (req: Request, res: Response) => {
  const query = listIncomeQuerySchema.parse(req.query)
  const items = await incomeService.listIncome(query)
  res.json({ data: toIncomeResponseList(items) })
})

export const getIncome = asyncHandler(async (req: Request, res: Response) => {
  const { id } = incomeIdParamSchema.parse(req.params)
  const found = await incomeService.getIncome(id)
  res.json({ data: toIncomeResponse(found) })
})

export const createIncome = asyncHandler(
  async (req: Request, res: Response) => {
    const input = createIncomeSchema.parse(req.body)
    // Zod coerces amount/receivedAt for validation; the service/repository
    // layer expects amount as a string and receivedAt as an ISO
    // string (Date -> string at the boundary, same rationale as
    // product.controller.ts's unitPrice string conversion)
    const created = await incomeService.createIncome({
      name: input.name,
      amount: String(input.amount),
      type: input.type,
      ...(input.type === 'recurring'
        ? { frequency: input.frequency }
        : { receivedAt: input.receivedAt?.toISOString() }),
    })
    res.status(201).json({ data: toIncomeResponse(created) })
  },
)

export const updateIncome = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = incomeIdParamSchema.parse(req.params)
    const input = updateIncomeSchema.parse(req.body)
    const updated = await incomeService.updateIncome(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.amount !== undefined ? { amount: String(input.amount) } : {}),
      ...(input.receivedAt !== undefined
        ? { receivedAt: input.receivedAt.toISOString() }
        : {}),
    })
    res.json({ data: toIncomeResponse(updated) })
  },
)

export const deleteIncome = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = incomeIdParamSchema.parse(req.params)
    await incomeService.deleteIncome(id)
    res.status(204).send()
  },
)

export const cancelIncome = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = incomeIdParamSchema.parse(req.params)
    const updated = await incomeService.cancelIncome(id)
    res.json({ data: toIncomeResponse(updated) })
  },
)

export const reactivateIncome = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = incomeIdParamSchema.parse(req.params)
    const updated = await incomeService.reactivateIncome(id)
    res.json({ data: toIncomeResponse(updated) })
  },
)
