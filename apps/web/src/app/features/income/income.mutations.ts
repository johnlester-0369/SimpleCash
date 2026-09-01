/**
 * Income Feature (Web) — Mutations
 * @module features/income/income.mutations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { incomeApi } from './income.api'
import { incomeKeys } from './income.constants'
import { dashboardKeys } from '@/app/features/dashboard/dashboard.constants'
import type { CreateIncomeInput, UpdateIncomeInput } from './income.types'

export function useCreateIncomeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateIncomeInput) => incomeApi.create(input),
    onSuccess: () => {
      // Invalidate dashboard summary alongside income list so recent activity and balance
      // reflect the newly added entry immediately without requiring a hard refresh
      queryClient.invalidateQueries({ queryKey: incomeKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.summary })
    },
  })
}

export function useUpdateIncomeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateIncomeInput }) =>
      incomeApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incomeKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.summary })
    },
  })
}

export function useDeleteIncomeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => incomeApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incomeKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.summary })
    },
  })
}

export function useCancelIncomeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => incomeApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incomeKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.summary })
    },
  })
}

export function useReactivateIncomeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => incomeApi.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incomeKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.summary })
    },
  })
}
