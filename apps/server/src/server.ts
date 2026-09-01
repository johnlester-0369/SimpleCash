import app from '@/app/app.js'
import { logger } from '@/infra/lib/logger.lib.js'
import { env } from '@/infra/core/config/env.config.js'
import { setShuttingDown } from '@/infra/lib/state/shutdown-state.lib.js'

// env.config.ts validates required vars (NODE_ENV, PORT) as a synchronous
// side effect of the import above — by the time this line runs, either the
// process has already exited on a missing var, or validation succeeded.
// Logged explicitly so startup failures vs. silent misconfiguration are
// distinguishable in production logs before the server ever binds a port.
logger.info('Environment configuration validated', { nodeEnv: env.NODE_ENV })

const PORT = Number(process.env['PORT'] ?? 3000)

const server = app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`)
})

// Guards against slow/stalled clients holding a connection open
// indefinitely (slowloris-style). headersTimeout must exceed
// requestTimeout — Node enforces this ordering internally.
server.requestTimeout = 30_000 // full request must complete within 30s
server.headersTimeout = 35_000 // headers must arrive within 35s

// Shared shutdown routine for SIGTERM (orchestrator-initiated) and SIGINT
// (Ctrl+C in local dev) — closes the HTTP server so in-flight requests drain
// before the process exits, rather than dropping connections mid-response
function gracefulShutdown(signal: string): void {
  logger.info(`${signal} received, shutting down gracefully`)

  // Flip readiness to false immediately so /health/ready starts returning
  // 503 — the load balancer stops routing new traffic here before we ever
  // touch the socket, avoiding the "orchestrator kills pod mid-request" gap
  setShuttingDown(true)

  const drainMs = Number(env.SHUTDOWN_DRAIN_MS)
  logger.info(
    `Waiting ${drainMs}ms for load balancer to deregister before closing`,
  )

  // Delay actually closing until the LB has had time to observe the failing
  // readiness probe and stop sending new connections — closing immediately
  // would still accept requests routed in the gap before the LB updates its pool
  setTimeout(() => {
    server.close(() => {
      logger.info('Server closed, all connections drained')
      process.exit(0)
    })
  }, drainMs)

  // Force-exit if connections haven't drained in time — prevents a stuck
  // shutdown from blocking container orchestrator restarts indefinitely
  setTimeout(() => {
    logger.error('Forced shutdown after timeout — connections did not drain')
    process.exit(1)
  }, drainMs + 10_000).unref()
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Uncaught exceptions leave the process in an undefined state — log and
// exit rather than continuing, per Node.js error handling best practices
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception, shutting down', { error: err })
  process.exit(1)
})

// Unhandled promise rejections indicate a missing .catch()/try-catch — treat
// as fatal so silent failures don't accumulate in production
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection, shutting down', { reason })
  process.exit(1)
})
