import { lazy } from 'react'

/**
 * Lazy Page Bundles
 *
 * Split per-route so the initial JS payload stays small. Isolated in this
 * module (rather than inline in router.tsx) so every export here is a
 * component — router.tsx's `router` export is a plain config object, and
 * react-refresh/only-export-components requires component exports and
 * non-component exports to live in separate files for Fast Refresh to
 * track module boundaries correctly.
 *
 * Only the admin shell remains: pages/login.tsx, pages/signup.tsx,
 * pages/showcase.tsx, and the customer-facing pages/dashboard.tsx were
 * deleted, so their lazy imports were removed rather than left dangling.
 */
export const AdminLoginPage = lazy(() => import('@/app/pages/index'))

export const AdminAccountSettingsPage = lazy(
  () => import('@/app/pages/settings/account'),
)

export const AdminIncomePage = lazy(() => import('@/app/pages/income'))

export const AdminExpensesPage = lazy(() => import('@/app/pages/expenses'))

export const AdminDashboardPage = lazy(() => import('@/app/pages/dashboard'))
