import { Suspense } from 'react'
import type { ReactElement } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import AdminProtectedRoute from '@/app/guards/AdminProtectedRoute'
import AdminPublicRoute from '@/app/guards/AdminPublicRoute'
import AdminDashboardLayout from '@/app/components/admin/layout'
import RouteError from '@/app/components/errors/RouteError'
import NotFoundPage from '@/app/components/errors/NotFoundPage'
// AdminAuthLayout and the lazy page components live in their own modules
// so this file's only export (`router`, a non-component config object)
// doesn't share a module with component exports — required by
// react-refresh/only-export-components for Fast Refresh to work
import AdminAuthLayout from '@/app/routes/AdminAuthLayout'
import { ROUTES } from '@/app/routes/routes.constants'
import {
  AdminLoginPage,
  AdminAccountSettingsPage,
  AdminIncomePage,
  AdminExpensesPage,
  AdminDashboardPage,
} from '@/app/routes/lazy-pages'

/**
 * Wraps lazy pages in a Suspense boundary. The blank surface fallback
 * matches the app background to prevent a flash of white during bundle
 * resolution.
 */
const withSuspense = (node: ReactElement) => (
  <Suspense fallback={<div className="min-h-screen" />}>{node}</Suspense>
)

/**
 * Admin-only router
 *
 * The customer-facing portal (home, login, signup, dashboard, showcase)
 * was removed, so every remaining route lives under AdminAuthLayout —
 * there's no longer a public top-level tree to keep it scoped away from.
 */
export const router = createBrowserRouter([
  {
    element: <AdminAuthLayout />,
    errorElement: <RouteError />,
    children: [
      {
        // Keeps an already-authenticated admin from seeing the login
        // form again on revisit — bounces straight to the dashboard.
        element: <AdminPublicRoute />,
        children: [
          {
            path: ROUTES.ADMIN.ROOT,
            element: withSuspense(<AdminLoginPage />),
          },
        ],
      },
      {
        element: <AdminProtectedRoute />,
        children: [
          {
            // AdminDashboardLayout renders <Outlet /> internally —
            // this route element doesn't pass children explicitly.
            element: <AdminDashboardLayout />,
            children: [
              {
                path: ROUTES.ADMIN.DASHBOARD,
                element: withSuspense(<AdminDashboardPage />),
              },
              {
                path: ROUTES.ADMIN.ACCOUNT_SETTINGS,
                element: withSuspense(<AdminAccountSettingsPage />),
              },
              {
                path: ROUTES.ADMIN.INCOME,
                element: withSuspense(<AdminIncomePage />),
              },
              {
                path: ROUTES.ADMIN.EXPENSES,
                element: withSuspense(<AdminExpensesPage />),
              },
            ],
          },
        ],
      },
    ],
  },

  // ── Catch-all: unmatched paths render the 404 page ──────────────────
  { path: '*', element: <NotFoundPage /> },
])
