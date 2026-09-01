/**
 * Admin Settings — Account Feature — Type Definitions
 *
 * Read-only profile shape for the currently authenticated admin's own
 * `user` row. Mutations (name/email/password) do not flow through this
 * type — they go through better-auth's own updateUser/changeEmail/
 * changePassword endpoints, per SPEC.md's "no custom endpoints needed"
 * note for /settings/account.
 *
 * @module app/features/settings/account/account.types
 */

export interface AccountProfile {
  readonly id: string
  email: string
  name: string
  readonly createdAt: string
  readonly updatedAt: string
}
