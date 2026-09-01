import { createAuthClient } from 'better-auth/react'
import { adminClient } from 'better-auth/client/plugins'
import { env } from '@/infra/core/config/env.config'
import { demoAuthClient } from '@/infra/modules/auth/demo/demo-auth.lib'

const realAuthAdminClient = createAuthClient({
  // Route every admin auth API call to the dedicated /api/admin-auth
  // handler instead of the default /api/auth mounted for customers
  basePath: '/api/admin-auth',
  // adminClient() adds authAdminClient.admin.* methods (listUsers,
  // setRole, banUser, ...) mapped to the admin plugin endpoints
  // registered on the server's adminAuth instance
  plugins: [adminClient()],
  fetchOptions: {
    // Ensures 'admin.session_token' travels with every admin auth
    // request — this cookie is fully isolated from the customer
    // portal's cookie, so credentials must be explicit here too
    credentials: 'include',
    onError(context: { error: Error; response?: Response }) {
      console.error('[admin-auth] Request failed:', context.error)
      if (context.response?.status === 401) {
        console.log('[admin-auth] Session expired or not authenticated')
      }
    },
  },
})

// Real better-auth-generated type, inferred once here — every consumer
// (AdminAuthContext, Navbar, Sidebar, account.mutations.ts, pages/index)
// keeps compiling against this exact shape whether demo mode is on or
// off, so switching the flag never ripples a type change outward.
export type AdminAuthClient = typeof realAuthAdminClient

// Single if/else switch point for the whole app: every real-vs-demo auth
// decision lives here and nowhere else. demoAuthClient (demo-auth.lib.ts)
// is a plain, independently-typed object implementing only the methods
// this app actually calls — the cast confines the "does it structurally
// match better-auth's full generated type" unsafety to this one line
// instead of forcing demo-auth.lib.ts to fight that generated type.
export const authAdminClient: AdminAuthClient = env.isDemoMode
  ? (demoAuthClient as unknown as AdminAuthClient)
  : realAuthAdminClient

// Re-exported individually so call sites don't need to know the client
// shape — matches how auth-client.ts re-exports the customer instance
export const { signIn, signUp, signOut, useSession } = authAdminClient
