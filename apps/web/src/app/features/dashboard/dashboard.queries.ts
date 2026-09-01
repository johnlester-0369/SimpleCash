/**
 * Dashboard Feature (Web) — Read Queries
 * @module features/dashboard/dashboard.queries
 */
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from './dashboard.api'
import { dashboardKeys } from './dashboard.constants'

export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: dashboardKeys.summary,
    queryFn: ({ signal }) => dashboardApi.getSummary(signal),
  })
}
