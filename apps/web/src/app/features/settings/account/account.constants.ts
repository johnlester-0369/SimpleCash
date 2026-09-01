/**
 * Admin Settings — Account Feature (Web) — Centralized Constants
 *
 * @module features/settings/account/account.constants
 */

// Matches server's apiRouter.use('/settings/account', ...) mounted under /api/v1
export const ACCOUNT_BASE_PATH = '/api/v1/settings/account'

export const accountKeys = {
  detail: [ACCOUNT_BASE_PATH] as const,
}
