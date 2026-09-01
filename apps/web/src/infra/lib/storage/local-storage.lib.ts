/**
 * Demo Local Storage Collection Helper
 *
 * Generic read/write/seed helpers backing every `*.demo.ts` module. Kept
 * framework/feature-agnostic (no Product/Supplier types referenced here)
 * so it is the one place demo persistence logic lives — feature demo
 * modules only decide *what* to store, never *how*.
 *
 * @module infra/lib/storage/local-storage.lib
 */

/**
 * Reads a JSON array collection from localStorage, seeding it with
 * `seed` on first access (empty browser storage) or after a corrupt/
 * non-JSON value (e.g. manually edited in DevTools) — a demo should
 * never hard-crash the app just because localStorage was tampered with.
 */
export function loadDemoCollection<T>(key: string, seed: T[]): T[] {
  const raw = localStorage.getItem(key)
  if (raw) {
    try {
      return JSON.parse(raw) as T[]
    } catch {
      // fall through to reseed below
    }
  }
  localStorage.setItem(key, JSON.stringify(seed))
  return seed
}

/** Persists a full collection, overwriting whatever was stored before. */
export function saveDemoCollection<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items))
}

/**
 * crypto.randomUUID() is available in every browser Vite 8 / React 19
 * target (Chrome 92+, Firefox 95+, Safari 15.4+) — no extra `uuid`
 * package dependency needed just for demo-mode id generation.
 */
export function generateDemoId(): string {
  return crypto.randomUUID()
}
