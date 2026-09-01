/**
 * Centralized Error Handling Middleware
 *
 * notFoundHandler catches unmatched routes; errorHandler is the terminal
 * error sink registered last in app.ts. Express 5 forwards rejected
 * promises from async route handlers to next(err) automatically, so most
 * async errors reach this file without an explicit try/catch per route.
 *
 * @module app/middleware/error-handler.middleware
 */
import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import {
  AppError,
  BadRequestError,
  NotFoundError,
  ValidationError,
} from '@/infra/lib/errors/app-error.lib.js'
import { env } from '@/infra/core/config/env.config.js'
import { logger } from '@/infra/lib/logger.lib.js'
import { HTTP_STATUS } from '@/infra/core/constants/http-status.constants.js'
/**
 * Registered after all routes. Converts unmatched paths into a proper
 * Registered after all routes. Converts unmatched paths into a proper
 * 404 AppError instead of falling through to Express's default HTML page.
 */
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`))
}

/**
 * Terminal error-handling middleware (4-arg signature is what makes Express
 * treat this as an error handler rather than regular middleware).
 * Must be registered after every other app.use()/route.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod throws on any schema.parse() failure inside a controller — normalize
  // it to the existing ValidationError shape so clients get 422 + field
  // details instead of falling through to the generic 500 branch below
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))

    err = new ValidationError('Validation failed', details)
  }

  // express.json()/urlencoded() throw a SyntaxError tagged with this `type`
  // when the payload isn't valid JSON — normalize it to a clean 400 instead
  // of falling through to the generic 500 branch, which would otherwise log
  // (and in non-production, echo) a raw body-parser stack trace
  if (
    err instanceof SyntaxError &&
    (err as { type?: string }).type === 'entity.parse.failed'
  ) {
    err = new BadRequestError('Malformed JSON in request body')
  }

  if (err instanceof AppError) {
    // Operational errors are expected — safe to log at warn and echo the message
    logger.warn(`${err.code}: ${err.message}`, {
      statusCode: err.statusCode,
      path: req.originalUrl,
    })

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err instanceof Error && 'details' in err
          ? { details: (err as { details?: unknown }).details }
          : {}),
      },
    })
    return
  }

  // Unknown/programmer errors: full detail goes to logs only. Stack traces
  // and internal messages must never reach the client in production —
  // that's an information-disclosure risk (file paths, dependency versions).
  logger.error('Unhandled error', { error: err, path: req.originalUrl })
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: env.isProduction ? 'An unexpected error occurred' : err.message,
      ...(env.isProduction ? {} : { stack: err.stack }),
    },
  })
}

/**
 * Wraps an async route handler so a rejected promise is forwarded to
 * next(err). Kept for compatibility with Express 4-style call sites even
 * though Express 5 does this automatically for direct async handlers —
 * still required when a handler passes a promise through a callback.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next)
  }
}
