/**
 * Better Auth Instance — Admin
 *
 * Isolated from the customer portal's auth instance (see
 * customer-auth.lib.ts) — runs at its own basePath (/api/admin-auth) and
 * writes cookies with the 'admin' prefix.
 *
 * Cookie independence guarantee:
 *   Customer portal → 'customer.session_token'  (set by customerAuth)
 *   Admin portal    → 'admin.session_token'      (set by this instance)
 *
 * Both instances share the same underlying Drizzle adapter — all
 * user/session rows coexist in the same tables. Session tokens are unique
 * per instance login so there is zero collision. Signing out of one
 * portal never touches the other's cookie or session row.
 *
 * @module infra/modules/auth/admin-auth.lib
 */
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware, APIError } from 'better-auth/api'
import { admin } from 'better-auth/plugins'
import { db } from '@/infra/lib/database/db.js'
import { env } from '@/infra/core/config/env.config.js'

export const adminAuth = betterAuth({
  basePath: '/api/admin-auth',
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  // 7-day sessions for the admin portal — shorter than the 30-day
  // customer window because admin accounts are high-value targets; a
  // smaller window limits stolen-cookie exposure.
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days for admin sessions
    updateAge: 60 * 60 * 24, // roll the expiry window daily on active sessions
  },
  emailAndPassword: {
    enabled: true,
    // Disable auto sign-in so a rejected non-admin sign-in (see the
    // role-gate hook below) can never leave the client in a
    // half-authenticated state.
    autoSignIn: false,
  },
  trustedOrigins: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : undefined,
  advanced: {
    // 'admin' prefix → browser stores 'admin.session_token';
    // completely separate from the customer auth cookie
    // 'customer.session_token'. A person simultaneously logged in to
    // both portals carries two independent HttpOnly cookies.
    cookiePrefix: 'admin',
  },
  plugins: [
    admin({
      defaultRole: 'user',
      adminRoles: ['admin'],
    }),
  ],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: 'memory',
    customRules: {
      '/sign-in/email': { window: 10, max: 3 },
    },
  },
  hooks: {
    // Top-level betterAuth() hooks accept a single createAuthMiddleware
    // directly. The { matcher, handler }[] array form is plugin-internal
    // only — using it here causes "hook.handler is not a function"
    // because better-auth calls .handler() on what it receives, but a
    // plain object is not callable. Path filtering happens inside the
    // middleware body as a guard clause instead.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-in/email') return
      const body = ctx.body as { email?: string } | undefined
      if (!body?.email) return // malformed body — let the main handler reject

      const user = await ctx.context.adapter.findOne({
        model: 'user',
        where: [{ field: 'email', value: body.email }],
      })

      // Check banned status BEFORE the role guard — when an account is
      // both banned and non-admin, the ban error is more specific and
      // actionable than "admin access required". Same expiry logic as
      // the customer-facing auth instance: fall through on expired bans
      // so better-auth can clear the flag on the next successful
      // sign-in attempt.
      if (user !== null) {
        const u = user as Record<string, unknown>
        if (u['banned'] === true) {
          const banExpires = u['banExpires'] as Date | null | undefined
          if (!banExpires || banExpires > new Date()) {
            const reason =
              (u['banReason'] as string | null | undefined) ??
              'No reason provided.'
            throw new APIError('FORBIDDEN', {
              message: `Your account has been banned. Reason: ${reason}`,
            })
          }
        }
      }

      // User exists but lacks the admin role → reject before password
      // verification. Unknown user → fall through so the main handler
      // returns "invalid credentials" (avoids leaking which emails are
      // registered vs which are merely non-admin).
      if (
        user !== null &&
        (user as Record<string, unknown>)['role'] !== 'admin'
      ) {
        return ctx.json(
          {
            message:
              'Admin access required. Only admin-role users may sign in here.',
          },
          { status: 403 },
        )
      }
    }),
  },
})
