/**
 * Admin Settings — Account Feature — Repository (Drizzle-backed)
 *
 * Reads the real `user` table (shared with better-auth), scoped only by
 * `id` — unlike customer.repository.ts this deliberately has no
 * role='user' filter, since the caller (account.controller.ts) always
 * supplies req.user.id from an authenticated admin session, never an
 * arbitrary id.
 *
 * @module app/features/settings/account/account.repository
 */
import { eq } from 'drizzle-orm'
import { db } from '@/infra/lib/database/db.js'
import { user } from '@/infra/lib/database/schema/auth.schema.js'
import type { AccountProfile } from './account.types.js'

function toAccountProfile(row: typeof user.$inferSelect): AccountProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export const accountRepository = {
  async findById(id: string): Promise<AccountProfile | undefined> {
    const row = await db.query.user.findFirst({
      where: eq(user.id, id),
    })
    return row ? toAccountProfile(row) : undefined
  },
}
