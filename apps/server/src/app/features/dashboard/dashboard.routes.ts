/**
 * Dashboard Feature — Routes
 * Mounted under /dashboard by app/routes.ts.
 * @module app/features/dashboard/dashboard.routes
 */
import { Router } from 'express'
import { getDashboardSummary } from './dashboard.controller.js'
import requireAdminAuth from '@/app/middleware/auth/require-admin-auth.middleware.js'
import requireAdmin from '@/app/middleware/admin/require-admin.middleware.js'

const router = Router()

router.use(requireAdminAuth, requireAdmin)

// Read-only aggregate — no strictRateLimit applied, unlike the mutating
// POST/PUT/DELETE routes on income/expenses
router.get('/summary', getDashboardSummary)

export default router
