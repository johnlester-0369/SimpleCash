/**
 * Admin Settings — Account Feature (Web) — API Client
 *
 * Only a Read call against /api/v1/settings/account — name/email/password
 * mutations bypass this apiClient entirely and call better-auth's own
 * client directly (see account.mutations.ts).
 *
 * @module features/settings/account/account.api
 */
import apiClient from '@/infra/lib/http/api-client.lib'
import type { AccountProfile, AccountProfileResponse } from './account.types'
import { ACCOUNT_BASE_PATH } from './account.constants'
import { env } from '@/infra/core/config/env.config'
import { accountDemoApi } from './account.demo'

export const accountApi = {
  // signal is forwarded from useQuery's queryFn context — without it,
  // react-query's automatic cancellation never reaches the underlying
  // fetch() call in apiClient
  async get(signal?: AbortSignal): Promise<AccountProfile> {
    if (env.isDemoMode) return accountDemoApi.get()
    const res = await apiClient.get<AccountProfileResponse>(ACCOUNT_BASE_PATH, {
      signal,
    })
    return res.data.data
  },
}
