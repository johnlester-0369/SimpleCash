/**
 * Income Feature — Routes
 * Mounted under /income by app/routes.ts.
 * @module app/features/income/income.routes
 */
import { Router } from 'express'
import {
  cancelIncome,
  createIncome,
  deleteIncome,
  getIncome,
  listIncome,
  reactivateIncome,
  updateIncome,
} from './income.controller.js'
import requireAdminAuth from '@/app/middleware/auth/require-admin-auth.middleware.js'
import requireAdmin from '@/app/middleware/admin/require-admin.middleware.js'
import strictRateLimit from '@/app/middleware/strict-rate-limit.middleware.js'

const router = Router()

router.use(requireAdminAuth, requireAdmin)

router.get('/', listIncome)
router.get('/:id', getIncome)
router.post('/', strictRateLimit, createIncome)
router.put('/:id', strictRateLimit, updateIncome)
router.delete('/:id', strictRateLimit, deleteIncome)
router.post('/:id/cancel', strictRateLimit, cancelIncome)
router.post('/:id/reactivate', strictRateLimit, reactivateIncome)

export default router
