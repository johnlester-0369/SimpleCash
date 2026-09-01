/**
 * Environment Configuration Module
 *
 * Centralized, type-safe environment variable management with runtime validation.
 * Fails fast on missing required variables - validates on import.
 *
 * @module infra/config/env.config.ts
 */
import 'dotenv/config'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Valid Node environment values.
 * Strictly typed to prevent runtime errors from invalid environment strings.
 */
type NodeEnv = 'development' | 'production' | 'test'

/**
 * Environment configuration type definition.
 * IMPORTANT: With exactOptionalPropertyTypes: true, optional properties
 * must explicitly include undefined in their type.
 */
interface EnvConfig {
  // Core application settings
  readonly NODE_ENV: NodeEnv
  readonly PORT: string

  // Logging configuration
  readonly LOG_LEVEL: string
  readonly LOG_FILE_PATH?: string | undefined
  readonly ERROR_LOG_FILE_PATH?: string | undefined

  // Security / hardening configuration
  readonly CORS_ORIGIN?: string | undefined
  readonly RATE_LIMIT_WINDOW_MS: string
  readonly RATE_LIMIT_MAX: string
  readonly ADMIN_RATE_LIMIT_WINDOW_MS: string
  readonly ADMIN_RATE_LIMIT_MAX: string
  readonly BODY_LIMIT: string
  readonly REQUEST_TIMEOUT_MS: string
  readonly SHUTDOWN_DRAIN_MS: string

  // Database & auth configuration
  readonly DATABASE_URL: string
  readonly BETTER_AUTH_SECRET: string
  readonly BETTER_AUTH_URL: string

  // Derived boolean helpers
  readonly isDevelopment: boolean
  readonly isProduction: boolean
  readonly isTest: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Valid NODE_ENV values as a readonly for validation.
 */
const VALID_NODE_ENVS: readonly NodeEnv[] = [
  'development',
  'production',
  'test',
] as const

/**
 * Valid log levels for winston.
 */
const VALID_LOG_LEVELS = [
  'error',
  'warn',
  'info',
  'http',
  'verbose',
  'debug',
  'silly',
] as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Retrieves a required environment variable.
 * @param key - Environment variable key
 * @returns Environment variable value
 * @throws {Error} If the variable is missing or empty
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (value === undefined || value === '') {
    throw new Error(
      `[ENV] Missing required environment variable: ${key}\n` +
        `Please check your .env file or environment configuration`,
    )
  }
  return value
}

/**
 * Retrieves an optional environment variable.
 * @param key - Environment variable key
 * @returns Environment variable value or undefined
 */
function getOptionalEnv(key: string): string | undefined {
  const value = process.env[key]
  return value === '' ? undefined : value
}

/**
 * Retrieves and validates NODE_ENV environment variable.
 * @returns Validated NodeEnv value
 * @throws {Error} If NODE_ENV is missing or not a valid value
 */
function getNodeEnv(): NodeEnv {
  const value = process.env.NODE_ENV
  if (value === undefined || value === '') {
    throw new Error(
      `[ENV] Missing required environment variable: NODE_ENV\n` +
        `Valid values are: ${VALID_NODE_ENVS.join(', ')}\n` +
        `Please check your .env file or environment configuration`,
    )
  }
  if (!VALID_NODE_ENVS.includes(value as NodeEnv)) {
    throw new Error(
      `[ENV] Invalid NODE_ENV value: "${value}"\n` +
        `Valid values are: ${VALID_NODE_ENVS.join(', ')}`,
    )
  }
  return value as NodeEnv
}

/**
 * Validates and retrieves LOG_LEVEL environment variable.
 * @returns Validated log level
 */
function getLogLevel(): string {
  const value = process.env.LOG_LEVEL ?? 'info'
  if (!VALID_LOG_LEVELS.includes(value as (typeof VALID_LOG_LEVELS)[number])) {
    console.warn(
      `[ENV] Invalid LOG_LEVEL value: "${value}". Using default: "info".\n` +
        `Valid values are: ${VALID_LOG_LEVELS.join(', ')}`,
    )
    return 'info'
  }
  return value
}

// ============================================================================
// CONFIGURATION OBJECT
// ============================================================================

// Cache NODE_ENV to avoid multiple validations
const nodeEnv = getNodeEnv()

/**
 * Validated environment configuration.
 * Access environment variables through this object for type safety.
 *
 * @example
 * ```typescript
 * import { env } from '@/infra/config/env.config.js';
 *
 * console.log(env.NODE_ENV);       // 'development' | 'production' | 'test'
 * console.log(env.PORT);           // '3000'
 *
 * if (env.isDevelopment) {
 *   // Development-only code
 * }
 * ```
 */
export const env: EnvConfig = {
  // Core environment
  NODE_ENV: nodeEnv,
  PORT: getRequiredEnv('PORT'),

  // Logging configuration
  LOG_LEVEL: getLogLevel(),
  LOG_FILE_PATH: getOptionalEnv('LOG_FILE_PATH'),
  ERROR_LOG_FILE_PATH: getOptionalEnv('ERROR_LOG_FILE_PATH'),

  // Security / hardening configuration
  CORS_ORIGIN: getOptionalEnv('CORS_ORIGIN'),
  RATE_LIMIT_WINDOW_MS: getOptionalEnv('RATE_LIMIT_WINDOW_MS') ?? '900000',
  RATE_LIMIT_MAX: getOptionalEnv('RATE_LIMIT_MAX') ?? '100',
  // Stricter than the global limiter — narrower window/lower ceiling for
  // admin mutating endpoints, per OWASP guidance on sensitive-endpoint
  // rate limiting (10 req/15min vs. the 100 req/15min global default)
  ADMIN_RATE_LIMIT_WINDOW_MS:
    getOptionalEnv('ADMIN_RATE_LIMIT_WINDOW_MS') ?? '900000',
  ADMIN_RATE_LIMIT_MAX: getOptionalEnv('ADMIN_RATE_LIMIT_MAX') ?? '10',
  BODY_LIMIT: getOptionalEnv('BODY_LIMIT') ?? '10kb',
  REQUEST_TIMEOUT_MS: getOptionalEnv('REQUEST_TIMEOUT_MS') ?? '30000',
  SHUTDOWN_DRAIN_MS: getOptionalEnv('SHUTDOWN_DRAIN_MS') ?? '10000',

  // Database & auth — required, fail fast at startup rather than crashing
  // on the first query or session check deep inside a request handler
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),
  BETTER_AUTH_SECRET: getRequiredEnv('BETTER_AUTH_SECRET'),
  BETTER_AUTH_URL: getRequiredEnv('BETTER_AUTH_URL'),

  // Derived boolean helpers for convenience
  isDevelopment: nodeEnv === 'development',
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
} as const

// CORS_ORIGIN unset falls back to '*' in app.ts — fine for local dev, but an
// open origin allowlist in production lets any site read authenticated
// responses via CORS; fail fast here rather than discovering it after a deploy
if (env.isProduction && !env.CORS_ORIGIN) {
  throw new Error(
    '[ENV] CORS_ORIGIN is required when NODE_ENV=production\n' +
      'Set a comma-separated allowlist — wildcard CORS is unsafe in production',
  )
}

/**
 * Re-export NodeEnv type for external use.
 */
export type { NodeEnv }
