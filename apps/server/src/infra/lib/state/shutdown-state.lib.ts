/**
 * Shutdown State — Shared Readiness Flag
 *
 * A mutable, module-scoped flag shared between server.ts (which flips it on
 * SIGTERM/SIGINT) and app.ts (which reads it in the /health/ready handler).
 * Kept as its own module rather than a variable in server.ts because app.ts
 * cannot import from server.ts without creating a circular import (server.ts
 * already imports app.ts) — this module is the shared dependency both sides
 * import instead.
 *
 * @module infra/lib/state/shutdown-state.lib
 */

let isShuttingDown = false

/**
 * Called once, from server.ts's SIGTERM/SIGINT handler, before the HTTP
 * server actually closes — flips readiness to false so /health/ready starts
 * returning 503 while the load balancer still has time to deregister this
 * instance.
 */
export function setShuttingDown(value: boolean): void {
  isShuttingDown = value
}

/**
 * Read by the /health/ready handler in app.ts on every request.
 */
export function getIsShuttingDown(): boolean {
  return isShuttingDown
}
