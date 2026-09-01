/**
 * Expenses Feature — Mapper
 * @module app/features/expenses/expense.mapper
 */
import type { ExpenseWithStatus } from './expense.types.js'

export interface ExpenseResponse {
  id: string
  name: string
  amount: string
  type: 'one_time' | 'recurring'
  frequency: 'minute' | 'hour' | 'day' | 'month' | 'year' | null
  purchasedAt: string | null
  status: 'active' | 'cancelled' | 'n/a'
  createdAt: string
}

export function toExpenseResponse(e: ExpenseWithStatus): ExpenseResponse {
  return { ...e }
}

export function toExpenseResponseList(
  items: ExpenseWithStatus[],
): ExpenseResponse[] {
  return items.map(toExpenseResponse)
}
