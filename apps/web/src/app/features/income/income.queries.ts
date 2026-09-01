/**
 * Income Feature (Web) — Read Queries
 * @module features/income/income.queries
 */
import { useQuery } from '@tanstack/react-query'
import { incomeApi } from './income.api'
import { incomeKeys } from './income.constants'
import type { ListIncomeParams } from './income.types'

export function useIncomeQuery(params: ListIncomeParams) {
  return useQuery({
    queryKey: incomeKeys.list(params),
    queryFn: ({ signal }) => incomeApi.list(params, signal),
  })
}
