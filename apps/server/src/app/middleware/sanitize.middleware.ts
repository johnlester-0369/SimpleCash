/**
 * Prototype-Pollution Guard Middleware
 *
 * Recursively strips `__proto__`, `constructor`, and `prototype` keys from
 * req.body/query/params before any downstream code (repositories, future
 * ORM merge calls) touches them. JSON.parse can produce an object with an
 * *own* property literally named "__proto__" — spread syntax doesn't walk
 * the real prototype chain, but a naive lodash.merge/Object.assign later
 * will. Cheapest place to close this is at the request boundary.
 *
 * @module app/middleware/sanitize.middleware
 */
import type { NextFunction, Request, Response } from 'express'

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function stripDangerousKeys<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => stripDangerousKeys(item)) as unknown as T
  }
  if (input !== null && typeof input === 'object') {
    const clean: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input)) {
      if (DANGEROUS_KEYS.has(key)) continue
      clean[key] = stripDangerousKeys(value)
    }
    return clean as T
  }
  return input
}

// req.query is a getter-only accessor in Express 5 (backed by IncomingMessage) —
// it can't be reassigned like req.body/req.params. Mutate the object Express
// gives us in place instead of replacing the reference.
function stripDangerousKeysInPlace(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.has(key)) {
      delete obj[key]
      continue
    }
    obj[key] = stripDangerousKeys(obj[key])
  }
}

export default function sanitizeRequest(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.body) req.body = stripDangerousKeys(req.body)
  if (req.query) stripDangerousKeysInPlace(req.query as Record<string, unknown>)
  if (req.params) req.params = stripDangerousKeys(req.params)

  next()
}
