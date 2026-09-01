import { getSessionCookie } from 'better-auth/cookies'
import { authAdminClient } from '@/infra/modules/auth/lib/admin-auth-client.lib'

/**
 * Two-Tier Session Validation — shared between proxy.ts's route guards
 * and Server Components (e.g. app/page.tsx).
 *
 * Tier 1 (getSessionCookie): free, no-network cookie-presence check —
 * skips Tier 2 entirely for the common case of a visitor with no
 * session cookie at all, avoiding unnecessary traffic to the Express API.
 *
 * Tier 2 (client.getSession): only runs when a cookie IS present,
 * hitting the real DB-backed validation endpoint — this is the actual
 * security-relevant check, unlike Tier 1 alone.
 *
 * @module infra/modules/auth/validate-session
 */

interface SessionClient {
  getSession: (options: {
    fetchOptions: { baseURL: string; headers: Record<string, string> }
  }) => Promise<{ data: unknown }>
}

// Narrowed from `Request` to just what getSessionCookie/validateSession
// actually touch (`.headers.get('cookie')`). Lets Server Components pass
// a lightweight { headers } object straight from next/headers' headers()
// instead of constructing a full Request with a synthetic URL — NextRequest
// (used by proxy.ts's guards) already satisfies this shape too.
interface RequestLike {
  headers: Headers
}

interface ValidateSessionParams {
  request: RequestLike
  client: SessionClient
  // Must be included explicitly: authClient/authAdminClient omit
  // baseURL so browser calls stay same-origin via the rewrite, and the
  // default basePath only applies implicitly when no baseURL is set at
  // client creation — see admin-auth-client.ts's explicit basePath.
  basePath: string
  cookiePrefix?: string
}

export interface SessionValidationResult {
  hasCookie: boolean
  isValid: boolean
}

export async function validateSession({
  request,
  client,
  basePath,
  cookiePrefix,
}: ValidateSessionParams): Promise<SessionValidationResult> {
  // better-auth's getSessionCookie is typed for a full Request, but only
  // ever reads request.headers.get('cookie') internally — safe to widen
  // RequestLike back to Request here rather than loosen its exported type
  const hasCookie = !!getSessionCookie(
    request as Request,
    cookiePrefix ? { cookiePrefix } : undefined,
  )

  if (!hasCookie) {
    return { hasCookie: false, isValid: false }
  }

  const { data: session } = await client.getSession({
    fetchOptions: {
      baseURL: `${basePath}`,
      headers: {
        Cookie: request.headers.get('cookie') ?? '',
      },
    },
  })

  return { hasCookie: true, isValid: !!session }
}

export async function validateAdminSession(
  request: RequestLike,
): Promise<SessionValidationResult> {
  // Presets the admin portal's isolated client/basePath/cookiePrefix —
  // mirrors validateCustomerSession but targets the adminAuth instance
  return validateSession({
    request,
    client: authAdminClient,
    basePath: '/api/admin-auth',
    cookiePrefix: 'admin',
  })
}
