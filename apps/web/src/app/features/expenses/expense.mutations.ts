/**
 * Expenses Feature (Web) — Mutations
 * @module features/expenses/expense.mutations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { expenseApi } from './expense.api'
import { expenseKeys } from './expense.constants'
import { dashboardKeys } from '@/app/features/dashboard/dashboard.constants'
import type { CreateExpenseInput, UpdateExpenseInput } from './expense.types'

export function useCreateExpenseMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => expenseApi.create(input),
    onSuccess: () => {
      // Invalidate dashboard summary so the dashboard live-updates
      queryClient.invalidateQueries({ queryKey: expenseKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.summary })
    },
  })
}

export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateExpenseInput }) =>
      expenseApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.summary })
    },
  })
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expenseApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.summary })
    },
  })
}

export function useCancelExpenseMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expenseApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.summary })
    },
  })
}

export function useReactivateExpenseMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expenseApi.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.summary })
    },
  })
}
