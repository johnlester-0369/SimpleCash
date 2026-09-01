/**
 * Income Feature (Web) — Centralized Constants
 * @module features/income/income.constants
 */

// Matches server's apiRouter.use('/income', ...) mounted under /api/v1
export const INCOME_BASE_PATH = '/api/v1/income'

export const incomeKeys = {
  all: [INCOME_BASE_PATH] as const,
  list: (params?: Record<string, unknown>) =>
    [INCOME_BASE_PATH, 'list', params ?? {}] as const,
  detail: (id: string) => [INCOME_BASE_PATH, id] as const,
}
