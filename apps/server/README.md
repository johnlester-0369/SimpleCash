# SimpleCash — Server (Admin API)

Answers one question, live: **out of everything I've earned, how much haven't I spent yet — and where is that headed?** This is the Express API behind SimpleCash, a personal money-runway tracker. It owns the balance/net-flow math, income/expense CRUD with a cancel/reactivate period lifecycle, an immutable activity ledger, and an isolated admin-only authentication layer — and can optionally serve the built React SPA (`apps/web`) directly from the same process.

There is no "starting balance" field. The current balance is a live sum: every income entry minus every expense entry, computed fresh on every request from elapsed time — nothing runs on a schedule in the background.

## Quick Start

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL
npm run db:migrate
npm run seed:admin
npm run dev
```

The dev server listens on `http://localhost:3000` (configurable via `PORT`). Sign in at the web app's `/` route with the credentials `seed:admin` prints. From the monorepo root, `make dev` starts both `apps/web` and `apps/server` together (see the root [`Makefile`](../../Makefile)).

## Tech Stack

- **Express 5** — HTTP framework
- **TypeScript** — strict mode, `nodenext` module resolution, `@/*` path alias mapped to `src/*`
- **Drizzle ORM** + **pg** — Postgres access, migrations via `drizzle-kit`
- **better-auth** — email/password auth, single admin-only instance with role-gated sign-in
- **winston** — structured logging (JSON in production, colorized in development)
- **helmet**, **cors**, **hpp**, **express-rate-limit**, **compression** — security/hardening middleware
- **zod** — request validation schemas per feature
- **tsx** — dev-mode TypeScript execution with watch mode

## Scripts

| Script                | Command                        | Purpose                                                                                     |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------------------------- |
| `npm run dev`         | `tsx watch src/server.ts`      | Start the dev server with hot reload                                                        |
| `npm run build`       | `tsc && tsc-alias`             | Compile to `dist/`, rewriting `@/*` aliases to relative paths                               |
| `npm run start`       | `node dist/server.js`          | Run the compiled production build                                                           |
| `npm run lint`        | `eslint .`                     | Lint the project                                                                            |
| `npm run format`      | `prettier --write .`           | Format the codebase                                                                         |
| `npm run audit`       | `npm audit --audit-level=high` | Check for high/critical severity dependency vulnerabilities                                 |
| `npm run db:generate` | `drizzle-kit generate`         | Generate a new SQL migration from schema changes                                            |
| `npm run db:migrate`  | `drizzle-kit migrate`          | Apply pending migrations to `DATABASE_URL`                                                  |
| `npm run seed:admin`  | `tsx scripts/seed-admin.ts`    | Bootstrap the first admin account (see [Seeding the First Admin](#seeding-the-first-admin)) |

## Environment Variables

Copy `.env.example` to `.env`. `NODE_ENV` and `PORT` are required — the process exits at startup if either is missing (`env.config.ts`).

| Variable                     | Default                 | Description                                                                                                      |
| ---------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                   | — (required)            | `development` \| `production` \| `test`                                                                          |
| `PORT`                       | — (required)            | Port the HTTP server listens on                                                                                  |
| `LOG_LEVEL`                  | `info`                  | winston level: `error` \| `warn` \| `info` \| `http` \| `verbose` \| `debug` \| `silly`                          |
| `LOG_FILE_PATH`              | unset                   | Optional file transport, only used when `NODE_ENV=production`                                                    |
| `ERROR_LOG_FILE_PATH`        | unset                   | Optional error-only file transport, production only                                                              |
| `CORS_ORIGIN`                | unset (`*`)             | Comma-separated allowlist; **required in production** — startup throws if unset when `NODE_ENV=production`       |
| `RATE_LIMIT_WINDOW_MS`       | `900000`                | Global IP-based rate limit window (applies to all `/api` and fallback traffic, not static assets)                |
| `RATE_LIMIT_MAX`             | `100`                   | Global rate limit ceiling per window                                                                             |
| `ADMIN_RATE_LIMIT_WINDOW_MS` | `900000`                | Stricter window for mutating income/expense endpoints                                                            |
| `ADMIN_RATE_LIMIT_MAX`       | `10`                    | Stricter ceiling for mutating income/expense endpoints (`strictRateLimit`, layered on top of the global limiter) |
| `BODY_LIMIT`                 | `10kb`                  | Max request body size (`express.json`/`urlencoded`)                                                              |
| `REQUEST_TIMEOUT_MS`         | `30000`                 | Max time a request may take before the timeout middleware aborts it                                              |
| `SHUTDOWN_DRAIN_MS`          | `10000`                 | Delay between SIGTERM/SIGINT and closing the HTTP server, giving the load balancer time to deregister            |
| `DATABASE_URL`               | — (required)            | Postgres connection string (Neon pooled connection recommended — see comments in `.env.example`)                 |
| `BETTER_AUTH_SECRET`         | — (required)            | better-auth instance secret                                                                                      |
| `BETTER_AUTH_URL`            | `http://localhost:3000` | better-auth base URL                                                                                             |

## Seeding the First Admin

There is no public sign-up route — `admin-auth.lib.ts` rejects sign-in for any account whose `role` isn't `admin`, and the admin plugin's own `setRole` API requires an already-authenticated admin caller. `scripts/seed-admin.ts` breaks that chicken-and-egg problem: it calls `adminAuth.api.signUpEmail` directly (so the password hash and account shape exactly match a real sign-up), then writes `role = 'admin'` straight to the database.

```bash
npm run seed:admin
```

The script hardcodes bootstrap credentials (`admin@example.com` / `ChangeMe123!`) [PLACEHOLDER - VERIFY BEFORE PUBLISHING: confirm these are still the values in scripts/seed-admin.ts before publishing, and change them for any real deployment]. Log in once with those, then change the password immediately via `/settings/account` on the web app.

## Architecture

### Request Pipeline (`src/app/app.ts`)

In order: Helmet (secure headers; CSP allows `'self'` script/style/img when `apps/web/dist` exists, denies by default otherwise) → CORS → static SPA files (only if `web/dist` exists) → Better Auth admin handler (`/api/admin-auth/*`, mounted before body parsing since it needs the raw request stream) → global IP-based rate limiter → compression → request logger → request timeout guard → JSON/urlencoded body parsing → HPP → input sanitization → health checks (`/health/live`, `/health/ready`) → `/api/v1` feature routes → SPA fallback (non-API, non-health GET routes, only if `web/dist` exists) → 404 handler → centralized error handler.

Static assets are served _before_ the rate limiter specifically so a normal page load's burst of JS/CSS/image requests never counts against or trips the IP-based limit — only API calls, the SPA fallback, and 404s pass through it.

### Feature Modules (`src/app/features/`)

Each feature follows the same layered shape:

```
<feature>/
├── <feature>.routes.ts       Router — wires middleware + controller methods
├── <feature>.controller.ts   Request/response handling, calls the service
├── <feature>.service.ts      Business rules (e.g. write-once amount/frequency on recurring entries)
├── <feature>.repository.ts   Drizzle queries, transactional writes + activity log inserts
├── <feature>.mapper.ts       Domain type → API response shape
├── <feature>.schema.ts       Zod validation schemas
└── <feature>.types.ts        Domain types
```

- **`dashboard`** — read-only aggregate endpoint (`GET /summary`). Computes current balance, daily net flow, growth-or-runway direction, all-time gross totals, a rolling weekly Spend vs Save breakdown, and a merged Recent Activity feed — all derived directly from `income`/`expense`/`activity_logs` tables in `dashboard.service.ts`, with no separate cron or background job.
- **`income`** / **`expenses`** — mirrored CRUD plus period lifecycle (create, edit, cancel, reactivate, delete). Recurring entries auto-open a period on creation; for recurring entries `amount` and `frequency` are write-once — `income.service.ts`/`expense.service.ts` reject edits to either, since every period leans on the parent row's current values and changing them would retroactively alter past periods' math. One-time entries can be deleted; recurring entries can only be cancelled (never hard-deleted).
- **`settings/account`** — read-only profile endpoint (`GET /`, scoped to `req.user.id` from the authenticated session). Profile mutations (name/email/password) go through better-auth's own client-side endpoints directly, not through this API — see `account.controller.ts`.

### Authentication

Admin-only, single portal. `admin-auth.lib.ts` configures a dedicated `betterAuth` instance mounted at `/api/admin-auth`, using the `admin` cookie prefix (`admin.session_token`) and a 7-day session with daily rolling renewal. A `before` hook on `/sign-in/email` checks the `banned` flag first, then rejects sign-in for any user whose `role` isn't `admin` — both checks run before password verification, and an unknown email falls through to the generic "invalid credentials" response so registered-but-non-admin emails aren't leaked. `requireAdminAuth` + `requireAdmin` middleware guard every feature route [PLACEHOLDER - VERIFY BEFORE PUBLISHING: exact behavior of these two middleware files, since their content was not available for this rewrite — confirm they match this description].

### Activity Logging

Every mutation (create, update, delete, cancel, reactivate) across `income` and `expenses` inserts a row into `activity_logs` inside the same database transaction as the primary change (`income.repository.ts` / `expense.repository.ts`). This is a permanent, storage-optimized ledger — a smallint `type` discriminator (`ACTIVITY_TYPE` in `activity.constants.ts`) instead of interpolated message strings — that survives hard deletion of the parent row. `dashboard.service.ts` merges these explicit log entries with dynamically-computed recurring accrual steps (the most recent 10 per span) to build the Recent Activity feed.

### Graceful Shutdown

`server.ts` sets Node-level `requestTimeout` (30s) and `headersTimeout` (35s) guards against slow/stalled clients. On `SIGTERM`/`SIGINT`, it immediately flips `/health/ready` to `503` via `shutdown-state.lib.ts` so the load balancer stops routing new traffic, waits `SHUTDOWN_DRAIN_MS` for in-flight requests to drain, closes the server, then force-exits after an additional 10 seconds if connections still haven't drained. Uncaught exceptions and unhandled promise rejections are also logged and treated as fatal.

## API Surface

All routes are mounted under `/api/v1` (`src/app/routes.ts`). Every route requires an authenticated admin session; mutating routes on `income`/`expenses` additionally pass through `strictRateLimit`.

| Method                                                                             | Path                            | Description                                                                                                              |
| ---------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GET`                                                                              | `/api/v1/dashboard/summary`     | Computed balance, net flow, runway/growth data, all-time totals, rolling weekly spend-vs-save breakdown, recent activity |
| `GET`                                                                              | `/api/v1/income`                | List income entries with derived status                                                                                  |
| `GET`                                                                              | `/api/v1/income/:id`            | Get a single income entry                                                                                                |
| `POST`                                                                             | `/api/v1/income`                | Create (recurring auto-opens first period)                                                                               |
| `PUT`                                                                              | `/api/v1/income/:id`            | Edit (recurring: name only)                                                                                              |
| `POST`                                                                             | `/api/v1/income/:id/cancel`     | Close the open period (409 if already cancelled)                                                                         |
| `POST`                                                                             | `/api/v1/income/:id/reactivate` | Open a new period (409 if already active)                                                                                |
| `DELETE`                                                                           | `/api/v1/income/:id`            | Delete (one-time only)                                                                                                   |
| `GET` \| `POST` \| `PUT` \| `DELETE` \| `POST .../cancel` \| `POST .../reactivate` | `/api/v1/expenses[...]`         | Mirrors the income endpoints above exactly                                                                               |
| `GET`                                                                              | `/api/v1/settings/account`      | Current admin's own profile (read-only; mutations go through better-auth directly)                                       |
| `ALL`                                                                              | `/api/admin-auth/*`             | better-auth admin instance (sign-in, sign-out, session, user management)                                                 |
| `GET`                                                                              | `/health/live`                  | Liveness probe — dependency-free, never checks the database                                                              |
| `GET`                                                                              | `/health/ready`                 | Readiness probe — `503` while draining on shutdown                                                                       |

## Data Model

```
income            id, name, amount, type (one_time | recurring), frequency (minute | hour | day | month | year, recurring only)
                  received_at (one_time only), created_at

income_periods    id, income_id (FK), start_date, end_date (null = currently active)
                  # an income entry can have many periods over its lifetime (cancel → reactivate → cancel → ...)

expenses          id, name, amount, type (one_time | recurring), frequency (minute | hour | day | month | year, recurring only)
                  purchased_at (one_time only), created_at

expense_periods   id, expense_id (FK), start_date, end_date (null = currently active)

activity_logs     id, type (smallint discriminator), name, amount (nullable), date
```

There is no separate "starting balance" field — the current balance is a live sum of every income entry minus every expense entry. Recurring entries accrue on a **step basis**: an entry only contributes its `amount` once a full billing period has elapsed since a period's `start_date`, summed across every period the entry has ever had (a subscription cancelled and reactivated multiple times accumulates multiple period rows, all counted). For recurring entries, `amount` and `frequency` are write-once at creation — only `name` can be edited afterward. One-time entries never touch the periods tables at all. Recurring entries can never be hard-deleted; cancel closes the open period (`end_date = now`) and reactivate opens a fresh one (`start_date = now`, `end_date = null`), preserving full history either way. Full formulas for balance, runway/growth, all-time totals, and the weekly spend-vs-save series are in the monorepo root [`SPEC.md`](../../SPEC.md).

Auth tables (`user`, `session`, `account`, `verification`) are owned by better-auth — see `src/infra/lib/database/schema/auth.schema.ts`.

Migrations are generated SQL artifacts stored under `database/migrations/` (kept outside `src/`, which is source-only) via `npm run db:generate` / `npm run db:migrate`, configured in `drizzle.config.ts`.

## Project Structure

```
src/
├── app/
│   ├── constants/          Shared constants (activity-type enum map)
│   ├── features/           Feature modules — dashboard, income, expenses, settings/account
│   ├── middleware/          Auth guards, admin guard, rate limiting, sanitization, request logging/timeout, error handling
│   ├── app.ts               Express app: middleware pipeline, health checks, SPA fallback
│   └── routes.ts            Single wiring point for every feature router
├── infra/
│   ├── core/                Env config, HTTP status constants, Express type augmentation, generic utils
│   ├── lib/                 Drizzle client + schema, custom error hierarchy, shutdown state, winston logger
│   └── modules/auth/        better-auth admin instance configuration
└── server.ts                 Entry point: starts the HTTP server, wires graceful shutdown and process-level error handlers
```

## Serving the Web Build

`app.ts` checks at startup whether `apps/web/dist` exists. If it does, this server serves the built SPA as static files, applies a browser-oriented CSP, and falls back to `index.html` for any unmatched non-API, non-health GET route — enabling single-service deployment. If it doesn't exist (e.g. local dev running only the API), those code paths are skipped entirely and the CSP defaults to an API-only, deny-by-default policy.
