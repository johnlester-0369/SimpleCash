/**
 * Request Timeout Middleware
 *
 * server.ts already sets requestTimeout/headersTimeout at the Node HTTP
 * server level, but those only guard against slow/stalled clients — they
 * don't bound how long a request may sit in application code (a hung
 * downstream call, an unresolved promise, an infinite loop in a handler).
 * This middleware is the application-level backstop: if a response hasn't
 * finished within REQUEST_TIMEOUT_MS, it aborts with 503 rather than
 * holding the connection (and its worker) open indefinitely.
 *
 * @module app/middleware/request-timeout.middleware
 */
import type { NextFunction, Request, Response } from 'express'
import { env } from '@/infra/core/config/env.config.js'
import { logger } from '@/infra/lib/logger.lib.js'

/**
 * Registered early in app.ts, right after the correlation id is assigned,
 * so a timed-out request still logs with the same correlationId as
 * everything else in request-logger's 'finish' handler.
 */
export default function requestTimeout(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const timeoutMs = Number(env.REQUEST_TIMEOUT_MS)

  const timer = setTimeout(() => {
    // Only act if nothing has sent a response yet — a handler that already
    // responded just before the timer fired must not get a second response
    // written on top of it (Express would throw ERR_HTTP_HEADERS_SENT)
    if (!res.headersSent) {
      logger.warn(`Request timed out after ${timeoutMs}ms`, {
        correlationId: req.correlationId,
        method: req.method,
        path: req.originalUrl,
      })

      res.status(503).json({
        error: {
          code: 'REQUEST_TIMEOUT',
          message: 'The server took too long to respond',
        },
      })
    }
  }, timeoutMs)

  // Cleared on completion so a fast request doesn't leave a dangling timer
  // running for the full timeoutMs — 'finish' covers normal completion,
  // 'close' covers a client disconnecting before the response finished
  res.on('finish', () => clearTimeout(timer))
  res.on('close', () => clearTimeout(timer))

  next()
}
