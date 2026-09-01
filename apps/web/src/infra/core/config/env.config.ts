/**
 * Environment Configuration Module (Web)
 *
 * Mirrors apps/server/src/infra/core/config/env.config.ts's validated
 * `env.*` object pattern for the client — every env-derived flag is read
 * through this one module instead of scattered named exports, matching
 * the server's env.NODE_ENV / env.isDevelopment shape.
 *
 * @module infra/core/config/env.config
 */

interface EnvConfig {
  readonly isDemoMode: boolean
}

// import.meta.env values are always strings — 'true'/'false' must be
// compared as strings, not coerced with Boolean(), since Boolean('false')
// is truthy and would silently force demo mode on in every build.
export const env: EnvConfig = {
  isDemoMode: import.meta.env.VITE_DEMO_MODE === 'true',
} as const
