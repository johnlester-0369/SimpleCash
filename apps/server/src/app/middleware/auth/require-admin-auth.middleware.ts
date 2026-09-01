/**
 * Admin Session-Resolving Auth Guard
 *
 * Mirrors require-auth.middleware.ts but resolves the session against the
 * `adminAuth` instance (cookiePrefix 'ba-admin') instead of the customer
 * `auth` instance. Better Auth's getSession only recognizes a cookie that
 * matches the CALLING instance's own cookiePrefix/basePath config — using
 * the customer instance's getSession on an admin-portal request silently
 * fails to find the 'ba-admin.session_token' cookie (or worse, resolves an
 * unrelated stale customer-portal session for the same browser). That is
 * what produced the false 403 "Admin role required" from /admin/customer:
 * requireAdmin was rejecting a role read off the WRONG session, not the
 * admin session the user had actually authenticated with.
 *
 * @module app/middleware/require-admin-auth.middleware
 */
import type { NextFunction, Request, Response } from 'express'
import { adminAuth } from '@/infra/modules/auth/admin-auth.lib.js'
import { UnauthorizedError } from '@/infra/lib/errors/app-error.lib.js'

export default async function requireAdminAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  // Same Headers-rebuild as require-auth.middleware.ts — Better Auth's
  // getSession expects a WHATWG Headers instance, not Express's plain
  // header object
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.append(key, value)
    else if (Array.isArray(value)) value.forEach((v) => headers.append(key, v))
  }

  // adminAuth.api.getSession only matches the 'ba-admin' cookie prefix
  // configured in auth.ts's advanced.cookiePrefix — this is what makes it
  // read the admin portal's own session instead of the customer portal's
  const session = await adminAuth.api.getSession({ headers })

  if (!session) {
    next(new UnauthorizedError('Admin authentication required'))
    return
  }

  // role defaults to 'user' via the admin plugin's defaultRole config —
  // always present on a valid session, never undefined here
  req.user = {
    id: session.user.id,
    email: session.user.email,
    role: (session.user as { role?: string }).role ?? 'user',
  }

  next()
}
