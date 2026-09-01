/**
 * Expenses Feature — Type Definitions
 * @module app/features/expenses/expense.types
 */

export type ExpenseType = 'one_time' | 'recurring'
export type ExpenseFrequency = 'minute' | 'hour' | 'day' | 'month' | 'year'

export interface Expense {
  readonly id: string
  name: string
  amount: string
  type: ExpenseType
  frequency: ExpenseFrequency | null
  purchasedAt: string | null
  readonly createdAt: string
}

// Derived, not stored — "active" iff the entry has any currently-open
// period (SPEC.md). One-time entries are always 'n/a' since they never
// touch expense_periods at all.
export type ExpenseStatus = 'active' | 'cancelled' | 'n/a'

export interface ExpenseWithStatus extends Expense {
  status: ExpenseStatus
}

// '| undefined' on each optional field is required by
// exactOptionalPropertyTypes: true — same rationale as income.types.ts
export type CreateExpenseInput = Pick<Expense, 'name' | 'amount' | 'type'> & {
  frequency?: ExpenseFrequency | undefined
  purchasedAt?: string | undefined
}

// Recurring entries only ever accept `name` here — amount/frequency are
// write-once per SPEC.md; expense.schema.ts (Zod) is the enforcement point
export type UpdateExpenseInput = {
  name?: string | undefined
  amount?: string | undefined
  purchasedAt?: string | undefined
}

export interface ListExpenseFilters {
  search?: string | undefined
  type?: ExpenseType | undefined
}
