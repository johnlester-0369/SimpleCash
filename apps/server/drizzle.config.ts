import { defineConfig } from 'drizzle-kit'

// drizzle-kit runs outside the app's module resolution (no tsconfig paths),
// so this reads DATABASE_URL directly from process.env rather than importing
// the app's env.config.ts
// Migrations are generated SQL artifacts, not source — kept under
// server/database/ rather than src/ so `src` stays source-only
export default defineConfig({
  schema: './src/infra/lib/database/schema.ts',
  out: './database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
