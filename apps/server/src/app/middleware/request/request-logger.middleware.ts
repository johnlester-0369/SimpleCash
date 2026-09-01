/**
 * Request Logging Middleware
 *
 * Assigns a per-request correlation ID and logs one line per completed
 * request at the 'http' level (method, path, status, duration). Populates
 * the `correlationId` field that logger.lib.ts already formats but that
 * nothing currently sets.
 *
 * @module app/middleware/request-logger.middleware
 */
import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { logger } from '@/infra/lib/logger.lib.js'

// Augment Express's Request so downstream handlers/loggers can read the id
// without an `as` cast at every call site
declare module 'express-serve-static-core' {
  interface Request {
    correlationId: string
  }
}

/**
 * Registered early in app.ts (after helmet/cors, before body parsing) so
 * every request — including ones that fail body parsing — gets an id and
 * a log line.
 */
export default function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Trust an inbound id from an upstream proxy/gateway if present, so a
  // single request keeps the same id across service boundaries; generate
  // one only when nothing upstream already assigned it
  const incomingId = req.headers['x-request-id']
  const correlationId =
    typeof incomingId === 'string' && incomingId.length > 0
      ? incomingId
      : randomUUID()

  req.correlationId = correlationId
  res.setHeader('x-request-id', correlationId)

  const startedAt = process.hrtime.bigint()

  // 'finish' fires once the response has been fully sent — logging here
  // (rather than at the top of the handler) captures the real status code
  // and total duration, including time spent in downstream middleware
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000

    logger.http(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      correlationId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    })
  })

  next()
}
