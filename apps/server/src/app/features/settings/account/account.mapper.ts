/**
 * Admin Settings — Account Feature — Mapper
 *
 * @module app/features/settings/account/account.mapper
 */
import type { AccountProfile } from './account.types.js'

export interface AccountProfileResponse {
  id: string
  email: string
  name: string
  createdAt: string
  updatedAt: string
}

export function toAccountProfileResponse(
  profile: AccountProfile,
): AccountProfileResponse {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  }
}
