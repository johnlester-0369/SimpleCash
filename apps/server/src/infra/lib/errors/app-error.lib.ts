/**
 * Custom Application Error Hierarchy
 *
 * All operational (expected) errors thrown inside route handlers or services
 * should extend AppError so the centralized error handler can shape a
 * consistent JSON response instead of leaking a generic 500 + stack trace.
 *
 * @module infra/lib/errors/app-error.lib
 */
import { HTTP_STATUS } from '@/infra/core/constants/http-status.constants.js'

/**
 * Base application error. Distinguishes operational errors (bad input,
 * not found, auth failures — expected and safe to report to the client)
 * from programmer errors (bugs — unexpected, must not leak details).
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  // Operational errors are anticipated failure modes; the error handler uses
  // this flag to decide whether it's safe to surface `message` to the client
  public readonly isOperational: boolean

  constructor(message: string, statusCode: number, code: string) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true

    // Excludes the constructor frame from the stack trace so logs point at
    // the actual throw site, not this base class
    Error.captureStackTrace(this, this.constructor)
  }
}

/** 400 — malformed or invalid request payload/params. */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, HTTP_STATUS.BAD_REQUEST, 'BAD_REQUEST')
  }
}

/** 401 — missing or invalid authentication credentials. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED')
  }
}

/** 403 — authenticated but not permitted to perform the action. */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, HTTP_STATUS.FORBIDDEN, 'FORBIDDEN')
  }
}

/** 404 — requested resource or route does not exist. */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND')
  }
}

/** 409 — request conflicts with current server state (e.g. duplicate). */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, HTTP_STATUS.CONFLICT, 'CONFLICT')
  }
}

/** 422 — semantically invalid payload (fails business-rule validation). */
export class ValidationError extends AppError {
  // Field-level details let clients highlight the specific invalid inputs
  public readonly details?: unknown[] | undefined

  constructor(message = 'Validation failed', details?: unknown[]) {
    super(message, HTTP_STATUS.VALIDATION_ERROR, 'VALIDATION_ERROR')
    this.details = details
  }
}
