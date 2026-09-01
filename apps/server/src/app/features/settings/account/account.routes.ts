/**
 * Admin Settings — Account Feature — Routes
 *
 * Mounted under /settings/account by app/routes.ts. Only exposes Read —
 * see account.controller.ts for why mutations are intentionally absent.
 *
 * @module app/features/settings/account/account.routes
 */
import { Router } from 'express'
import { getAccount } from './account.controller.js'
import requireAdminAuth from '@/app/middleware/auth/require-admin-auth.middleware.js'
import requireAdmin from '@/app/middleware/admin/require-admin.middleware.js'

const router = Router()

// Every route on this router requires an authenticated admin session
router.use(requireAdminAuth, requireAdmin)

router.get('/', getAccount)

export default router
