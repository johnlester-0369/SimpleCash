/**
 * Admin Role Guard
 *
 * Must be mounted AFTER requireAuth — it reads req.user, which requireAuth
 * is what populates. Kept as a separate middleware (rather than a flag on
 * requireAuth) so non-admin authenticated routes don't pay for a role
 * check they don't need.
 *
 * @module app/middleware/require-admin.middleware
 */
import type { NextFunction, Request, Response } from 'express'
import { ForbiddenError } from '@/infra/lib/errors/app-error.lib.js'

export default function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  // req.user is populated by requireAuth; a missing/non-admin role here
  // means the caller authenticated as an ordinary customer, not an admin
  if (req.user.role !== 'admin') {
    next(new ForbiddenError('Admin role required'))
    return
  }
  next()
}
