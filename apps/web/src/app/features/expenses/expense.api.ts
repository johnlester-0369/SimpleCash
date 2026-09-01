/**
 * Expenses Feature (Web) — API Client
 *
 * Checks `env.isDemoMode` and routes calls either offline (via localStorage)
 * or to the live Express API. Permits live product demonstrations without a DB.
 *
 * @module features/expenses/expense.api
 */
import apiClient from '@/infra/lib/http/api-client.lib'
import type {
  CreateExpenseInput,
  Expense,
  ExpenseListResponse,
  ExpenseResponse,
  ListExpenseParams,
  UpdateExpenseInput,
} from './expense.types'
import { EXPENSE_BASE_PATH } from './expense.constants'
import { env } from '@/infra/core/config/env.config'
import { expenseDemoApi } from './expense.demo'

export const expenseApi = {
  async list(
    params: ListExpenseParams,
    signal?: AbortSignal,
  ): Promise<ExpenseListResponse> {
    if (env.isDemoMode) return expenseDemoApi.list(params)
    const res = await apiClient.get<ExpenseListResponse>(EXPENSE_BASE_PATH, {
      params: { ...params },
      signal,
    })
    return res.data
  },

  async create(input: CreateExpenseInput): Promise<Expense> {
    if (env.isDemoMode) return expenseDemoApi.create(input)
    const res = await apiClient.post<ExpenseResponse, CreateExpenseInput>(
      EXPENSE_BASE_PATH,
      input,
    )
    return res.data.data
  },

  async update(id: string, input: UpdateExpenseInput): Promise<Expense> {
    if (env.isDemoMode) return expenseDemoApi.update(id, input)
    const res = await apiClient.put<ExpenseResponse, UpdateExpenseInput>(
      `${EXPENSE_BASE_PATH}/${id}`,
      input,
    )
    return res.data.data
  },

  async remove(id: string): Promise<void> {
    if (env.isDemoMode) return expenseDemoApi.remove(id)
    await apiClient.delete(`${EXPENSE_BASE_PATH}/${id}`)
  },

  async cancel(id: string): Promise<Expense> {
    if (env.isDemoMode) return expenseDemoApi.cancel(id)
    const res = await apiClient.post<ExpenseResponse>(
      `${EXPENSE_BASE_PATH}/${id}/cancel`,
    )
    return res.data.data
  },

  async reactivate(id: string): Promise<Expense> {
    if (env.isDemoMode) return expenseDemoApi.reactivate(id)
    const res = await apiClient.post<ExpenseResponse>(
      `${EXPENSE_BASE_PATH}/${id}/reactivate`,
    )
    return res.data.data
  },
}
