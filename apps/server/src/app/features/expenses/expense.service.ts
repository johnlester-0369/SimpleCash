/**
 * Expenses Feature — Service
 * @module app/features/expenses/expense.service
 */
import {
  BadRequestError,
  NotFoundError,
} from '@/infra/lib/errors/app-error.lib.js'
import { expenseRepository } from './expense.repository.js'
import type {
  CreateExpenseInput,
  ExpenseWithStatus,
  ListExpenseFilters,
  UpdateExpenseInput,
} from './expense.types.js'

export const expenseService = {
  async listExpenses(
    filters: ListExpenseFilters,
  ): Promise<ExpenseWithStatus[]> {
    return expenseRepository.findAll(filters)
  },

  async getExpense(id: string): Promise<ExpenseWithStatus> {
    const found = await expenseRepository.findById(id)
    if (!found) throw new NotFoundError(`Expense entry ${id} not found`)
    return found
  },

  async createExpense(input: CreateExpenseInput): Promise<ExpenseWithStatus> {
    return expenseRepository.create(input)
  },

  async updateExpense(
    id: string,
    input: UpdateExpenseInput,
  ): Promise<ExpenseWithStatus> {
    const existing = await expenseRepository.findById(id)
    if (!existing) throw new NotFoundError(`Expense entry ${id} not found`)

    // SPEC.md: recurring entries only accept `name` — amount is
    // write-once because every period leans on the parent row's amount;
    // editing it would retroactively recompute past periods' math
    if (
      existing.type === 'recurring' &&
      (input.amount !== undefined || input.purchasedAt !== undefined)
    ) {
      throw new BadRequestError(
        'Recurring expense entries only allow editing the name. Cancel and create a new entry to change the amount.',
      )
    }

    const updated = await expenseRepository.update(id, input)
    if (!updated) throw new NotFoundError(`Expense entry ${id} not found`)
    return updated
  },

  async deleteExpense(id: string): Promise<void> {
    const existing = await expenseRepository.findById(id)
    if (!existing) throw new NotFoundError(`Expense entry ${id} not found`)

    // SPEC.md: "Recurring entries can never be hard-deleted — cancel
    // (and reactivate later, if needed) instead."
    if (existing.type === 'recurring') {
      throw new BadRequestError(
        'Recurring expense entries cannot be deleted. Cancel it instead.',
      )
    }

    const deleted = await expenseRepository.delete(id)
    if (!deleted) throw new NotFoundError(`Expense entry ${id} not found`)
  },

  async cancelExpense(id: string): Promise<ExpenseWithStatus> {
    return expenseRepository.cancel(id)
  },

  async reactivateExpense(id: string): Promise<ExpenseWithStatus> {
    return expenseRepository.reactivate(id)
  },
}
