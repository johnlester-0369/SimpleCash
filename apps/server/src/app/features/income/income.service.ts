/**
 * Income Feature — Service
 * @module app/features/income/income.service
 */
import {
  BadRequestError,
  NotFoundError,
} from '@/infra/lib/errors/app-error.lib.js'
import { incomeRepository } from './income.repository.js'
import type {
  CreateIncomeInput,
  IncomeWithStatus,
  ListIncomeFilters,
  UpdateIncomeInput,
} from './income.types.js'

export const incomeService = {
  async listIncome(filters: ListIncomeFilters): Promise<IncomeWithStatus[]> {
    return incomeRepository.findAll(filters)
  },

  async getIncome(id: string): Promise<IncomeWithStatus> {
    const found = await incomeRepository.findById(id)
    if (!found) throw new NotFoundError(`Income entry ${id} not found`)
    return found
  },

  async createIncome(input: CreateIncomeInput): Promise<IncomeWithStatus> {
    return incomeRepository.create(input)
  },

  async updateIncome(
    id: string,
    input: UpdateIncomeInput,
  ): Promise<IncomeWithStatus> {
    const existing = await incomeRepository.findById(id)
    if (!existing) throw new NotFoundError(`Income entry ${id} not found`)

    // SPEC.md: recurring entries only accept `name` — amount is
    // write-once because every period leans on the parent row's current
    // amount; editing it would retroactively recompute past periods.
    if (
      existing.type === 'recurring' &&
      (input.amount !== undefined || input.receivedAt !== undefined)
    ) {
      throw new BadRequestError(
        'Recurring income entries only allow editing the name. Cancel and create a new entry to change the amount.',
      )
    }

    const updated = await incomeRepository.update(id, input)
    if (!updated) throw new NotFoundError(`Income entry ${id} not found`)
    return updated
  },

  async deleteIncome(id: string): Promise<void> {
    const existing = await incomeRepository.findById(id)
    if (!existing) throw new NotFoundError(`Income entry ${id} not found`)

    // SPEC.md: "Recurring entries can never be hard-deleted — cancel
    // (and reactivate later, if needed) instead."
    if (existing.type === 'recurring') {
      throw new BadRequestError(
        'Recurring income entries cannot be deleted. Cancel it instead.',
      )
    }

    const deleted = await incomeRepository.delete(id)
    if (!deleted) throw new NotFoundError(`Income entry ${id} not found`)
  },

  async cancelIncome(id: string): Promise<IncomeWithStatus> {
    return incomeRepository.cancel(id)
  },

  async reactivateIncome(id: string): Promise<IncomeWithStatus> {
    return incomeRepository.reactivate(id)
  },
}
