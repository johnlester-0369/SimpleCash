/**
 * Admin Settings — Account Feature (Web) — Read Queries
 *
 * @module features/settings/account/account.queries
 */
import { useQuery } from '@tanstack/react-query'
import { accountApi } from './account.api'
import { accountKeys } from './account.constants'

export function useAccountQuery() {
  return useQuery({
    queryKey: accountKeys.detail,
    queryFn: ({ signal }) => accountApi.get(signal),
  })
}
