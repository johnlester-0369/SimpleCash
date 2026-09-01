/**
 * Income Feature (Web) — API Client
 *
 * Checks `env.isDemoMode` and routes calls either offline (via localStorage)
 * or to the live Express API. Permits live product demonstrations without a DB.
 *
 * @module features/income/income.api
 */
import apiClient from '@/infra/lib/http/api-client.lib'
import type {
  CreateIncomeInput,
  Income,
  IncomeListResponse,
  IncomeResponse,
  ListIncomeParams,
  UpdateIncomeInput,
} from './income.types'
import { INCOME_BASE_PATH } from './income.constants'
import { env } from '@/infra/core/config/env.config'
import { incomeDemoApi } from './income.demo'

export const incomeApi = {
  async list(
    params: ListIncomeParams,
    signal?: AbortSignal,
  ): Promise<IncomeListResponse> {
    if (env.isDemoMode) return incomeDemoApi.list(params)
    const res = await apiClient.get<IncomeListResponse>(INCOME_BASE_PATH, {
      params: { ...params },
      signal,
    })
    return res.data
  },

  async create(input: CreateIncomeInput): Promise<Income> {
    if (env.isDemoMode) return incomeDemoApi.create(input)
    const res = await apiClient.post<IncomeResponse, CreateIncomeInput>(
      INCOME_BASE_PATH,
      input,
    )
    return res.data.data
  },

  async update(id: string, input: UpdateIncomeInput): Promise<Income> {
    if (env.isDemoMode) return incomeDemoApi.update(id, input)
    const res = await apiClient.put<IncomeResponse, UpdateIncomeInput>(
      `${INCOME_BASE_PATH}/${id}`,
      input,
    )
    return res.data.data
  },

  async remove(id: string): Promise<void> {
    if (env.isDemoMode) return incomeDemoApi.remove(id)
    await apiClient.delete(`${INCOME_BASE_PATH}/${id}`)
  },

  async cancel(id: string): Promise<Income> {
    if (env.isDemoMode) return incomeDemoApi.cancel(id)
    const res = await apiClient.post<IncomeResponse>(
      `${INCOME_BASE_PATH}/${id}/cancel`,
    )
    return res.data.data
  },

  async reactivate(id: string): Promise<Income> {
    if (env.isDemoMode) return incomeDemoApi.reactivate(id)
    const res = await apiClient.post<IncomeResponse>(
      `${INCOME_BASE_PATH}/${id}/reactivate`,
    )
    return res.data.data
  },
}
