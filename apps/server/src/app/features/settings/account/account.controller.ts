/**
 * Admin Settings — Account Feature — Controller
 *
 * Deliberately GET-only: name/email/password changes are handled by
 * better-auth's own updateUser/changeEmail/changePassword endpoints
 * (mounted at /api/admin-auth/* in app.ts), called directly from the
 * web client — see account.mutations.ts. This controller only exposes
 * the Read side, backed by our own Drizzle query.
 *
 * @module app/features/settings/account/account.controller
 */
import type { Request, Response } from 'express'
import { asyncHandler } from '@/app/middleware/error-handler.middleware.js'
import { accountService } from './account.service.js'
import { toAccountProfileResponse } from './account.mapper.js'

// req.user.id comes from requireAdminAuth (see infra/core/types/express.d.ts
// augmentation) — there is deliberately no :id param on this route, since
// an admin may only ever read their own account, never another admin's
export const getAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await accountService.getAccount(req.user.id)
  res.json({ data: toAccountProfileResponse(account) })
})
