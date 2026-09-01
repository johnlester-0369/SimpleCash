import { Outlet } from 'react-router-dom'
import { AdminAuthProvider } from '@/infra/modules/auth/contexts/AdminAuthContext'

/**
 * AdminAuthLayout — scopes AdminAuthProvider to the /admin/* subtree.
 * Isolates admin session state from CustomerAuthContext (which wraps the
 * whole app in main.tsx) — AdminProtectedRoute and the admin pages both
 * call useAdminAuth(), which only resolves inside this provider.
 *
 * Extracted to its own module (rather than defined inline in router.tsx)
 * so this component export doesn't share a file with the non-component
 * `router` export — required by react-refresh/only-export-components.
 */
export default function AdminAuthLayout() {
  return (
    <AdminAuthProvider>
      <Outlet />
    </AdminAuthProvider>
  )
}
