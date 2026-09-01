/**
 * HTTP Status Code Constants
 *
 * Fixed, well-known values (RFC 7231/7807) — extracted here so
 * `app-error.lib.ts` and any other consumer reference a semantic name
 * instead of repeating the same numeric literal at every throw site.
 *
 * @module infra/core/constants/http-status.constants
 */

// `as const` narrows each property to its literal numeric type instead of
// `number`, so consumers get compile-time literal checking, not just a
// runtime object.
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const
