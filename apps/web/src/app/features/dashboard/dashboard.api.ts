/**
 * Dashboard Feature (Web) — API Client
 *
 * Fetches dashboard aggregation from mock or backend dependent on environment.
 * @module features/dashboard/dashboard.api
 */
import apiClient from '@/infra/lib/http/api-client.lib'
import type {
  DashboardSummary,
  DashboardSummaryResponse,
} from './dashboard.types'
import { DASHBOARD_BASE_PATH } from './dashboard.constants'
import { env } from '@/infra/core/config/env.config'
import { dashboardDemoApi } from './dashboard.demo'

export const dashboardApi = {
  async getSummary(signal?: AbortSignal): Promise<DashboardSummary> {
    if (env.isDemoMode) return dashboardDemoApi.getSummary()
    const res = await apiClient.get<DashboardSummaryResponse>(
      `${DASHBOARD_BASE_PATH}/summary`,
      { signal },
    )
    return res.data.data
  },
}
