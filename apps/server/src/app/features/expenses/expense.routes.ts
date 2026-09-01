/**
 * Expenses Feature — Routes
 * Mounted under /expenses by app/routes.ts.
 * @module app/features/expenses/expense.routes
 */
import { Router } from 'express'
import {
  cancelExpense,
  createExpense,
  deleteExpense,
  getExpense,
  listExpenses,
  reactivateExpense,
  updateExpense,
} from './expense.controller.js'
import requireAdminAuth from '@/app/middleware/auth/require-admin-auth.middleware.js'
import requireAdmin from '@/app/middleware/admin/require-admin.middleware.js'
import strictRateLimit from '@/app/middleware/strict-rate-limit.middleware.js'

const router = Router()

router.use(requireAdminAuth, requireAdmin)

router.get('/', listExpenses)
router.get('/:id', getExpense)
router.post('/', strictRateLimit, createExpense)
router.put('/:id', strictRateLimit, updateExpense)
router.delete('/:id', strictRateLimit, deleteExpense)
router.post('/:id/cancel', strictRateLimit, cancelExpense)
router.post('/:id/reactivate', strictRateLimit, reactivateExpense)

export default router
