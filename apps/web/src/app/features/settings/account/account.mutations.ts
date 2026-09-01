/**
 * Admin Settings — Account Feature (Web) — Mutations
 *
 * Per Better Auth's 2026 docs (users-accounts.mdx / email-password.mdx),
 * updateUser/changeEmail/changePassword are the client's own built-in
 * methods — not custom server endpoints — so these wrap authAdminClient
 * directly rather than calling apiClient. changeEmail applies immediately
 * here because updateEmailWithoutVerification is enabled server-side
 * (see admin-auth.lib.ts) — no verification-pending UI is needed.
 *
 * @module features/settings/account/account.mutations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authAdminClient } from '@/infra/modules/auth/lib/admin-auth-client.lib'
import { accountKeys } from './account.constants'

export function useUpdateNameMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await authAdminClient.updateUser({ name })
      if (error) throw new Error(error.message || 'Failed to update name')
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: accountKeys.detail }),
  })
}

export function useChangeEmailMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (newEmail: string) => {
      const { error } = await authAdminClient.changeEmail({ newEmail })
      if (error) throw new Error(error.message || 'Failed to update email')
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: accountKeys.detail }),
  })
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: async (input: {
      currentPassword: string
      newPassword: string
    }) => {
      const { error } = await authAdminClient.changePassword({
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        // Invalidates other active sessions on this account for the same
        // reason a stolen-cookie window is minimized elsewhere in this app
        revokeOtherSessions: true,
      })
      if (error) throw new Error(error.message || 'Failed to update password')
    },
  })
}
