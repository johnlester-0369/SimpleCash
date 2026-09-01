/**
 * Expenses Feature (Web) — Read Queries
 * @module features/expenses/expense.queries
 */
import { useQuery } from '@tanstack/react-query'
import { expenseApi } from './expense.api'
import { expenseKeys } from './expense.constants'
import type { ListExpenseParams } from './expense.types'

export function useExpensesQuery(params: ListExpenseParams) {
  return useQuery({
    queryKey: expenseKeys.list(params),
    queryFn: ({ signal }) => expenseApi.list(params, signal),
  })
}
