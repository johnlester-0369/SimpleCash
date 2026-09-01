/**
 * Admin Settings — Account Feature (Web) — Demo Data
 *
 * Reads the same user record demo-auth.lib.ts's session store manages, so
 * a name change on the Account Settings page (via account.mutations.ts →
 * authAdminClient.updateUser, itself demo-routed) is immediately reflected
 * here too — one user record, not two copies drifting apart.
 *
 * @module features/settings/account/account.demo
 */
import { getDemoSessionUser } from '@/infra/modules/auth/demo/demo-auth.lib'
import type { AccountProfile } from './account.types'

// account.mutations.ts already talks to authAdminClient directly (itself
// demo-routed) for name/email/password — this module only needs to cover
// account.api.ts's Read call, which additionally surfaces createdAt (a
// field the session object doesn't carry, per account.tsx's own comment).
export const accountDemoApi = {
  get(): AccountProfile {
    const user = getDemoSessionUser()
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  },
}
