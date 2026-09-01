/**
 * API Router — /api/v1
 *
 * Single wiring point for every feature router. app.ts mounts this one
 * router at the version prefix, so bumping to /api/v2 later is a one-line
 * change in app.ts rather than touching every feature file.
 *
 * @module app/routes
 */
import { Router } from 'express'
import adminAccountRoutes from '@/app/features/settings/account/account.routes.js'
import adminIncomeRoutes from '@/app/features/income/income.routes.js'
import adminExpenseRoutes from '@/app/features/expenses/expense.routes.js'
import adminDashboardRoutes from '@/app/features/dashboard/dashboard.routes.js'

const apiRouter = Router()

apiRouter.use('/settings/account', adminAccountRoutes)
apiRouter.use('/income', adminIncomeRoutes)
apiRouter.use('/expenses', adminExpenseRoutes)
apiRouter.use('/dashboard', adminDashboardRoutes)

export default apiRouter
