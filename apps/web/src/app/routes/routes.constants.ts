/**
 * Route Constants
 *
 * Single source of truth for all application route paths. Nested under
 * ADMIN because the customer-facing portal (home/login/signup/dashboard/
 * showcase) has been removed — every remaining page belongs to the admin
 * shell, and router.tsx, both admin guards, and pages/dashboard.tsx all
 * already read paths from ROUTES.ADMIN.* rather than a flat shape.
 */
export const ROUTES = {
  ADMIN: {
    ROOT: '/',
    DASHBOARD: '/dashboard',
    ACCOUNT_SETTINGS: '/settings/account',
    INCOME: '/income',
    EXPENSES: '/expenses',
  },
} as const
