/**
 * Express Request Augmentation — Authenticated Admin User
 *
 * requireAdminAuth (require-admin-auth.middleware.ts) assigns req.user after
 * resolving a valid admin session; requireAdmin (require-admin.middleware.ts)
 * reads req.user.role downstream. Express's base Request type has no `user`
 * property, so both call sites fail tsc's strict check without this ambient
 * augmentation. Kept as its own leaf types file (rather than folded into
 * request-logger.middleware.ts's existing correlationId augmentation) so the
 * auth-shaped contract lives with other cross-cutting core types, not inside
 * an unrelated logging middleware — TypeScript merges declare module blocks
 * for the same module across files, so this coexists with that one safely.
 *
 * @module infra/core/types/express
 */

declare module 'express-serve-static-core' {
  interface Request {
    // Populated only by requireAdminAuth after a validated adminAuth
    // session lookup — role is always present (admin plugin's defaultRole
    // guarantees it), never optional/undefined on an authenticated request
    user: {
      id: string
      email: string
      role: string
    }
  }
}

// Empty export makes this an ES module (not a global script) so the
// declare module block above is treated as an augmentation rather than a
// redeclaration — required under isolatedModules: true in tsconfig.json
export {}
