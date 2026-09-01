/**
 * Strict Rate Limit Middleware — Sensitive/Mutating Endpoints
 *
 * The global limiter in app.ts (RATE_LIMIT_WINDOW_MS/MAX) protects every
 * route uniformly, but 2026 guidance calls for a materially tighter
 * ceiling on endpoints that mutate state or touch privileged data (here:
 * admin user create/update/delete) — a shared limit sized for read-heavy
 * traffic would let a credential-stuffing or scripted-abuse client exhaust
 * its budget on cheap GETs before ever being throttled on the expensive
 * writes that actually matter.
 *
 * @module app/middleware/strict-rate-limit.middleware
 */
import rateLimit from 'express-rate-limit'
import { env } from '@/infra/core/config/env.config.js'

// Layered on top of — not instead of — the global limiter already applied
// in app.ts; this only tightens the budget further on the routes it's
// mounted on, it doesn't replace app-wide protection.
const strictRateLimit = rateLimit({
  windowMs: Number(env.ADMIN_RATE_LIMIT_WINDOW_MS),
  max: Number(env.ADMIN_RATE_LIMIT_MAX),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests to this endpoint, please try again later.',
  },
})

export default strictRateLimit
