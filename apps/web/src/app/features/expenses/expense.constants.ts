/**
 * Expenses Feature (Web) — Centralized Constants
 * @module features/expenses/expense.constants
 */

// Matches server's apiRouter.use('/expenses', ...) mounted under /api/v1
export const EXPENSE_BASE_PATH = '/api/v1/expenses'

export const expenseKeys = {
  all: [EXPENSE_BASE_PATH] as const,
  list: (params?: Record<string, unknown>) =>
    [EXPENSE_BASE_PATH, 'list', params ?? {}] as const,
  detail: (id: string) => [EXPENSE_BASE_PATH, id] as const,
}
