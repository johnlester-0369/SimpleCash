# SimpleCash

> Out of everything I've earned, how much haven't I spent yet — and where is that headed?

SimpleCash is a personal money-runway tracker. It answers that question live: current balance, savings rate or runway countdown, and a weekly Spend vs Save breakdown, computed fresh on every request from elapsed time — nothing runs on a schedule in the background.

This is a two-package monorepo:

| Package | What it is | README |
|---|---|---|
| [`apps/server`](apps/server/README.md) | Express + Drizzle + Postgres admin API | Full API surface, data model, auth, activity ledger |
| [`apps/web`](apps/web/README.md) | React 19 + Vite admin portal | Routes, tech stack, demo mode |

**Why this exists:** tracking income and spending as two separate flat lists — rather than a single ledger or a budgeting-category system — keeps the mental model simple: money in, money out, live balance. There's no "starting balance" field; your current balance is your first Income entry.

## Quick Start

```bash
git clone <this-repo-url>
cd SimpleCash
make install
```

```bash
cd apps/server
cp .env.example .env
# fill in DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL
npm run db:migrate
npm run seed:admin
```

```bash
cd apps/web
cp .env.example .env
```

```bash
make dev
```

`make dev` starts both apps concurrently: the API on `http://localhost:3000`, the web app on `http://localhost:5173`. Sign in at `/` with the credentials `seed:admin` printed to the console.

Each `make` target wraps the corresponding npm script in `apps/web` or `apps/server` — see the root [`Makefile`](Makefile) for the full command list (`make help`).

## Architecture

```
SimpleCash/
├── apps/
│   ├── server/    Express API — business logic, Postgres, auth
│   └── web/       React SPA — admin portal UI
└── Makefile       Orchestration: install, dev, build, lint, format, clean (wraps npm scripts in both apps)
```

The two apps are independent npm projects with their own `package.json` and lockfile — the Makefile never touches a root `node_modules`. In production, `apps/server` can optionally serve the built `apps/web` SPA directly from the same Express process (see [Serving the Web Build](apps/server/README.md#serving-the-web-build)), enabling single-service deployment; in development they run as two separate processes with Vite proxying `/api/*` to the Express server.

### Request flow

Browser → Vite dev server (`:5173`, proxies `/api/*`) → Express API (`:3000`) → Postgres (Drizzle ORM). Admin sessions are managed by better-auth on both sides, isolated under `/api/admin-auth`.

### Data model

`income` / `income_periods` and `expenses` / `expense_periods` mirror each other; an `activity_logs` table is an immutable ledger of every mutation. There is no "starting balance" — the balance is a live sum of every income entry minus every expense entry, with recurring entries accruing on a step basis (a full billing period must elapse before the amount is counted). Full schema and formulas are documented in [`apps/server/README.md`](apps/server/README.md#data-model).

## Tech Stack

| Layer | Stack |
|---|---|
| API | Express 5, TypeScript (strict, `nodenext`), Drizzle ORM + pg, better-auth, winston, zod |
| Web | React 19, React Router 7, Vite 8, TypeScript, Tailwind CSS v4, TanStack Query v5, React Hook Form + Zod, Recharts |
| Shared | better-auth (admin-only, single portal), Zod schemas per feature |

See [`apps/server/README.md`](apps/server/README.md#tech-stack) and [`apps/web/README.md`](apps/web/README.md#tech-stack) for full dependency lists and rationale.

## Documentation Map

| Document | Covers |
|---|---|
| [`apps/server/README.md`](apps/server/README.md) | API setup, environment variables, request pipeline, auth, activity logging, full API surface |
| [`apps/web/README.md`](apps/web/README.md) | Web app setup, routes, project structure, demo mode |

## Demo Mode

Don't want to run Postgres locally? Set `VITE_DEMO_MODE=true` in `apps/web/.env` and skip the server setup entirely — the web app runs standalone against seeded `localStorage` data, including a mirrored client-side implementation of the balance/runway math. See [Demo Mode](apps/web/README.md#demo-mode) in the web README.