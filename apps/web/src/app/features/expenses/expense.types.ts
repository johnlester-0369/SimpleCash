/**
 * Expenses Feature (Web) — Type Definitions
 * Mirrors the server's expense.mapper.ts response shape.
 * @module features/expenses/expense.types
 */

export type ExpenseType = 'one_time' | 'recurring'
export type ExpenseFrequency = 'minute' | 'hour' | 'day' | 'month' | 'year'
export type ExpenseStatus = 'active' | 'cancelled' | 'n/a'

export interface Expense {
  readonly id: string
  name: string
  amount: string
  type: ExpenseType
  frequency: ExpenseFrequency | null
  purchasedAt: string | null
  status: ExpenseStatus
  readonly createdAt: string
}

export interface ExpenseResponse {
  data: Expense
}

export interface ExpenseListResponse {
  data: Expense[]
}

export interface ListExpenseParams {
  [key: string]: unknown
  search?: string
  type?: ExpenseType
}

export type CreateExpenseInput =
  | {
      type: 'one_time'
      name: string
      amount: number
      purchasedAt?: string
    }
  | {
      type: 'recurring'
      name: string
      amount: number
      frequency: ExpenseFrequency
    }

export interface UpdateExpenseInput {
  name?: string
  amount?: number
  purchasedAt?: string
}
