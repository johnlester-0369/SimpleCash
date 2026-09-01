/**
 * Dashboard Feature (Web) — Centralized Constants
 * @module features/dashboard/dashboard.constants
 */

// Matches server's apiRouter.use('/dashboard', ...) mounted under /api/v1
export const DASHBOARD_BASE_PATH = '/api/v1/dashboard'

export const dashboardKeys = {
  summary: [DASHBOARD_BASE_PATH, 'summary'] as const,
}
