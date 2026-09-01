/**
 * Admin Settings — Account Feature (Web) — Type Definitions
 *
 * Mirrors the server's app/features/settings/account/account.mapper.ts
 * response shape. Name/email/password mutation types live in
 * account.schema.ts instead — those go through better-auth's client,
 * not this REST shape.
 *
 * @module features/settings/account/account.types
 */

export interface AccountProfile {
  readonly id: string
  email: string
  name: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface AccountProfileResponse {
  data: AccountProfile
}
