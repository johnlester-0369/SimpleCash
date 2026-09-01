/**
 * Dashboard Feature — Controller
 * @module app/features/dashboard/dashboard.controller
 */
import type { Request, Response } from 'express'
import { asyncHandler } from '@/app/middleware/error-handler.middleware.js'
import { dashboardService } from './dashboard.service.js'

export const getDashboardSummary = asyncHandler(
  async (_req: Request, res: Response) => {
    const summary = await dashboardService.getSummary()
    res.json({ data: summary })
  },
)
