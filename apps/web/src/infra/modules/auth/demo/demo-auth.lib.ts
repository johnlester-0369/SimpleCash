/**
 * Demo Admin Auth Client
 *
 * Client-side-only stand-in for better-auth's admin client, wired in
 * exclusively through admin-auth-client.lib.ts's isDemoMode branch — that
 * file is the single source of truth for which implementation is live;
 * nothing else in the app imports this module directly.
 *
 * Session state lives in localStorage (not cookies — there is no server
 * to set one) and is broadcast to every useSession() subscriber via a
 * tiny pub/sub store, so a login/logout in one component (Sidebar) is
 * instantly reflected in another (Navbar) without a page reload — the
 * same cross-component reactivity better-auth's real useSession() gives.
 *
 * Fixed credentials are intentionally public: demo mode never talks to
 * the real Express/Postgres backend, so there is no account, database,
 * or session to protect here — this is a UI walkthrough, not an auth
 * boundary, and none of this ships when VITE_DEMO_MODE is unset.
 *
 * @module infra/modules/auth/demo/demo-auth
 */
import { useSyncExternalStore } from 'react'

const SESSION_STORAGE_KEY = 'demo:admin-session'

export const DEMO_ADMIN_CREDENTIALS = {
  email: 'simplecash.demo@gmail.com',
  password: 'simplecash-demo1234',
} as const

interface DemoAdminUser {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
}

interface DemoAdminSession {
  session: { userId: string; expiresAt: string; token: string }
  user: DemoAdminUser
}

const FIXED_DEMO_USER: DemoAdminUser = {
  id: 'demo-admin-user',
  name: 'Demo Admin',
  email: DEMO_ADMIN_CREDENTIALS.email,
  role: 'admin',
  createdAt: '2026-01-05T09:00:00.000Z',
  updatedAt: '2026-01-05T09:00:00.000Z',
}

const listeners = new Set<() => void>()
function notify(): void {
  listeners.forEach((listener) => listener())
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function readSession(): DemoAdminSession | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as DemoAdminSession
  } catch {
    return null
  }
}

function writeSession(session: DemoAdminSession | null): void {
  if (session) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  }
  notify()
}

/** Read by account.demo.ts so the Account Settings page's demo profile
 * shares the exact same user record as the auth session instead of two
 * copies drifting apart after a name change. */
export function getDemoSessionUser(): DemoAdminUser {
  return readSession()?.user ?? FIXED_DEMO_USER
}

// useSyncExternalStore requires a stable snapshot reference — caching the
// last-seen raw string avoids returning a new object identity (and
// re-rendering every subscriber) on every render when nothing changed.
let cachedRaw: string | null | undefined
let cachedSnapshot: DemoAdminSession | null = null
function getSnapshot(): DemoAdminSession | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY)
  if (raw === cachedRaw) return cachedSnapshot
  cachedRaw = raw
  cachedSnapshot = readSession()
  return cachedSnapshot
}

function useDemoSession() {
  const session = useSyncExternalStore(subscribe, getSnapshot)
  return {
    data: session,
    // No network round-trip in demo mode — localStorage reads are
    // synchronous, so there is never a real "pending" window to represent
    isPending: false,
    error: null as Error | null,
    refetch: () => notify(),
  }
}

export const demoAuthClient = {
  useSession: useDemoSession,
  signIn: {
    async email(
      values: { email: string; password: string; rememberMe?: boolean },
      options?: {
        onSuccess?: () => void
        onError?: (ctx: { error: { message?: string } }) => void
      },
    ) {
      const isValid =
        values.email === DEMO_ADMIN_CREDENTIALS.email &&
        values.password === DEMO_ADMIN_CREDENTIALS.password
      if (!isValid) {
        const error = {
          message: `Invalid credentials — demo mode only accepts ${DEMO_ADMIN_CREDENTIALS.email}`,
        }
        options?.onError?.({ error })
        return { error }
      }
      writeSession({
        session: {
          userId: FIXED_DEMO_USER.id,
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          token: 'demo-session-token',
        },
        user: FIXED_DEMO_USER,
      })
      options?.onSuccess?.()
      return { error: null }
    },
  },
  signUp: {
    async email() {
      return { error: { message: 'Sign up is disabled in demo mode.' } }
    },
  },
  async signOut(options?: {
    fetchOptions?: {
      onSuccess?: () => void
      onError?: (ctx: { error: { message?: string } }) => void
    }
  }) {
    writeSession(null)
    options?.fetchOptions?.onSuccess?.()
    return { error: null }
  },
  async updateUser(input: { name: string }) {
    const current = readSession()
    if (!current) return { error: { message: 'Not signed in' } }
    writeSession({
      ...current,
      user: {
        ...current.user,
        name: input.name,
        updatedAt: new Date().toISOString(),
      },
    })
    return { error: null }
  },
  async changeEmail(input: { newEmail: string }) {
    const current = readSession()
    if (!current) return { error: { message: 'Not signed in' } }
    writeSession({
      ...current,
      user: {
        ...current.user,
        email: input.newEmail,
        updatedAt: new Date().toISOString(),
      },
    })
    return { error: null }
  },
  async changePassword(input: {
    currentPassword: string
    newPassword: string
    revokeOtherSessions?: boolean
  }) {
    // Demo login always checks against the fixed DEMO_ADMIN_CREDENTIALS
    // constant, so there is nowhere to persist a changed password — this
    // still validates the current password for a realistic success/
    // failure UX without silently pretending to store a new one.
    if (input.currentPassword !== DEMO_ADMIN_CREDENTIALS.password) {
      return { error: { message: 'Current password is incorrect' } }
    }
    return { error: null }
  },
}
