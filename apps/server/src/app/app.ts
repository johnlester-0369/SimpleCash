import express, { type Request, type Response } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import hpp from 'hpp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import requestLogger from '@/app/middleware/request/request-logger.middleware.js'
import sanitizeRequest from '@/app/middleware/sanitize.middleware.js'
import requestTimeout from '@/app/middleware/request/request-timeout.middleware.js'
import { getIsShuttingDown } from '@/infra/lib/state/shutdown-state.lib.js'
import { env } from '@/infra/core/config/env.config.js'
import apiRouter from '@/app/routes.js'
import { toNodeHandler } from 'better-auth/node'
import { adminAuth } from '@/infra/modules/auth/admin-auth.lib.js'
import {
  errorHandler,
  notFoundHandler,
} from '@/app/middleware/error-handler.middleware.js'

const app = express()

// ESM has no __dirname global — derive it from import.meta.url so the static
// root below resolves correctly regardless of the working directory the
// process is launched from (matches Express 5.x's documented absolute-path
// recommendation for express.static)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Compiled output lives at apps/server/dist/app/app.js (tsconfig rootDir/outDir
// mirror src/ 1:1), so three levels up reaches apps/, then across to web/dist —
// the Vite production build of the React SPA
const webDistPath = path.join(__dirname, '../../../web/dist')

// Checked once at startup, not per-request — explicit condition rather than
// relying solely on express.static's implicit next() fallthrough. Keeps local
// dev (no build yet) from ever registering static/SPA-fallback middleware at all.
// Computed early (before Helmet) because the CSP below branches on it.
const webDistExists = fs.existsSync(webDistPath)

// Trust the first hop (your reverse proxy/load balancer) so req.ip reflects
// the real client address instead of the proxy's — required for the rate
// limiter below to key off actual clients rather than one shared IP.
// Adjust the hop count (or use a CIDR list) if you sit behind more than
// one proxy layer.
app.set('trust proxy', 1)

// Helmet sets secure HTTP headers first so they attach to every response,
// including static assets and error responses — must run before any other
// middleware (including express.static below) so nothing can short-circuit
// the response before headers are attached. CSP is branched on webDistExists:
// when this instance also serves the built SPA, scripts/styles/images need
// to be allowed from 'self'; when it's API-only, deny by default rather than
// inheriting Helmet's browser-oriented defaults.
app.use(
  helmet({
    contentSecurityPolicy: webDistExists
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            // Many Vite/CSS-in-JS setups inject <style> tags at runtime and
            // need 'unsafe-inline' here. Tighten with nonces/hashes later if
            // your build supports it.
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
          },
        }
      : {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'none'"],
            styleSrc: ["'none'"],
            imgSrc: ["'none'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
          },
        },
    // Only meaningful once this service is reachable directly over HTTPS —
    // if TLS terminates at a reverse proxy/load balancer instead, set HSTS
    // there and remove this to avoid duplicate/conflicting headers
    hsts: {
      maxAge: 31_536_000,
      includeSubDomains: true,
      preload: true,
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  }),
)

// CORS_ORIGIN is a comma-separated allowlist; '*' only when unset so local
// dev isn't blocked without explicit configuration
const corsOrigins = env.CORS_ORIGIN
  ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : '*'
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
)

// Serve the compiled SPA before the global rate limiter so static asset
// requests (JS/CSS/image bundles, which a browser fires many of per page
// load) are never counted against — or rejected by — the IP-based limit
// below. express.static sends the response and never calls next() for a
// matched file, so a matched static request never reaches the limiter at
// all; only requests that fall through (API calls, the SPA fallback, and
// eventual 404s) are subject to it.
if (webDistExists) {
  app.use(express.static(webDistPath))
}

// Better Auth needs the raw request stream — mounted before express.json()
// so its handler receives an unparsed body; it has its own internal rate
// limiting, separate from the global limiter registered below. Routes
// admin-portal traffic to the independent adminAuth instance, which sets
// the 'admin.session_token' cookie.
app.all('/api/admin-auth/*splat', toNodeHandler(adminAuth))

// Global IP-based rate limit — now runs after static asset serving so it
// only ever throttles API traffic (and the SPA-fallback/404 path), never
// a legitimate page load's burst of static asset requests.
const limiter = rateLimit({
  windowMs: Number(env.RATE_LIMIT_WINDOW_MS),
  max: Number(env.RATE_LIMIT_MAX),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})

app.use(limiter)

// Compression, request logging, and the request-timeout guard are
// registered ahead of express.static (and, by extension, ahead of the
// rate limiter below) so served static assets still get gzip'd, get a
// correlation id logged, and are bounded by the same handler timeout as
// every other response — none of that depended on rate-limiting order.
app.use(compression())
app.use(requestLogger)
app.use(requestTimeout)

// BODY_LIMIT caps request payload size to prevent memory-exhaustion DoS via
// oversized request bodies; parse before any route handler sees the body
app.use(express.json({ limit: env.BODY_LIMIT }))
app.use(express.urlencoded({ extended: true, limit: env.BODY_LIMIT }))

// Must run after body/query parsing (needs parsed objects to inspect) and
// before any route handler touches req.body/query/params
app.use(hpp())
app.use(sanitizeRequest)

// Liveness probe: confirms only that the Node.js process is running and
// the event loop is responsive — must stay dependency-free (no DB/cache
// checks) so a slow downstream dependency never causes a false-negative
// restart of an otherwise-healthy process
app.get('/health/live', (_req, res) => {
  res.json({ status: 'ok' })
})

// Readiness probe: tells the load balancer whether this instance should
// receive traffic. Returns 503 while gracefulShutdown (server.ts) is
// draining connections, so the LB deregisters this instance before the
// socket actually closes rather than after
app.get('/health/ready', (_req, res) => {
  if (getIsShuttingDown()) {
    res.status(503).json({ status: 'shutting_down' })
    return
  }
  res.json({ status: 'ok' })
})

// Root route provides minimal API entry point for developers testing the server
// Returns basic service info without exposing any sensitive details
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Hello World',
    status: 'running',
    version: '1.0.0',
  })
})

// All feature routes are wired through the single apiRouter and mounted
// under a version prefix so a future /api/v2 doesn't require touching
// individual feature routers
app.use('/api/v1', apiRouter)

// SPA fallback: React Router owns client-side paths like /dashboard or
// /admin/login, which don't correspond to real files on disk. Only active
// when webDistExists — otherwise local dev falls straight through to
// notFoundHandler as before. Excluding /api explicitly is required: an
// unmatched API route reaches here via apiRouter's own next() call, and
// without the guard it would incorrectly return index.html instead of
// notFoundHandler's JSON 404. Unlike the static assets above, this
// fallback runs after the rate limiter — it serves index.html on every
// unmatched client-side route, so it's rate-limited like any other route.
if (webDistExists) {
  app.use((req, res, next) => {
    if (
      req.method !== 'GET' ||
      req.path.startsWith('/api') ||
      req.path.startsWith('/health')
    ) {
      next()
      return
    }
    res.sendFile(path.join(webDistPath, 'index.html'), (err) => {
      if (err) next(err)
    })
  })
}

// Catch-all for unmatched routes — must be registered after all other routes
// so it only fires when nothing else handled the request
app.use(notFoundHandler)

// Centralized error handler — must be registered last so Express recognizes
// it as error-handling middleware (4-arg signature) and routes all next(err) here
app.use(errorHandler)

export default app
