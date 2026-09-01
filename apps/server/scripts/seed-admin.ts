/**
 * Admin Bootstrap Script
 *
 * Run once to create the first admin account. Uses adminAuth's own
 * signUpEmail — the same instance that will later authenticate this
 * account on the admin portal — so password hashing/validation goes
 * through the exact path a real admin sign-up would use, then a direct
 * DB update sets role='admin'. The admin plugin's setRole API requires an
 * authenticated admin session to call, which is circular at bootstrap time
 * (there is no admin yet), hence the direct write below.
 *
 * Credentials below are hardcoded for one-time bootstrap use only.
 * CHANGE THE PASSWORD IMMEDIATELY AFTER FIRST LOGIN, then remove or
 * rotate these values — do not leave real credentials committed to source.
 *
 * Usage: npm run seed:admin
 *
 * @module scripts/seed-admin
 */
import { eq } from 'drizzle-orm'
import { adminAuth } from '../src/infra/modules/auth/admin-auth.lib.js'
import { db } from '../src/infra/lib/database/db.js'
import { user } from '../src/infra/lib/database/schema/auth.schema.js'

// Hardcoded bootstrap credentials — intended for local/one-time use only.
// Replace before running, and never commit real production credentials.
const ADMIN_EMAIL = 'admin@example.com'
const ADMIN_PASSWORD = 'ChangeMe123!'
const ADMIN_NAME = 'Admin'

async function seedAdmin(): Promise<void> {
  console.log(`Creating admin account for ${ADMIN_EMAIL}...`)

  // adminAuth.api.signUpEmail is the same instance the admin portal's own
  // sign-in flow validates against (basePath /api/admin-auth, 'admin'
  // cookie prefix) — using it here (rather than inserting into `user`
  // directly, or going through customerAuth) means the password hash and
  // account shape match a real admin sign-up exactly, avoiding any
  // hashing-scheme or instance-config drift.
  const result = await adminAuth.api.signUpEmail({
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: ADMIN_NAME },
  })

  if (!result.user) {
    throw new Error(
      'signUpEmail did not return a user — account may already exist',
    )
  }

  // Direct DB write is the deliberate escape hatch: the admin plugin's
  // setRole requires an authenticated admin caller, which is circular for
  // creating the very first admin
  await db
    .update(user)
    .set({ role: 'admin' })
    .where(eq(user.id, result.user.id))

  console.log(
    `Admin account created and promoted: ${ADMIN_EMAIL} (id: ${result.user.id})`,
  )
  console.log(`Login email:    ${ADMIN_EMAIL}`)
  console.log(`Login password: ${ADMIN_PASSWORD}`)
  console.log(
    'IMPORTANT: change this password immediately after logging in for the first time.',
  )
  process.exit(0)
}

seedAdmin().catch((err) => {
  console.error('Failed to seed admin:', err)
  process.exit(1)
})
