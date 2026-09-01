# SimpleCash — Web (Admin Portal)

A single question, answered live: **out of everything I've earned, how much haven't I spent yet — and where is that headed?**

SimpleCash is a personal money-runway tracker. This package (`apps/web`) is the admin-only React frontend that renders that answer — current balance, savings rate or runway countdown, and a weekly Spend vs Save breakdown — paired with the Express API in `apps/server`.

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

The dev server runs at `http://localhost:5173`. `vite.config.ts` proxies every `/api/*` request to `http://localhost:3000` (the `apps/server` Express API) so admin session cookies land on the same origin — no explicit `baseURL` is needed on the auth client.

From the monorepo root, `make dev` starts both `apps/web` and `apps/server` together (see the root [`Makefile`](../../Makefile)).

Prefer not to run a backend at all? Set `VITE_DEMO_MODE=true` in `.env` — the whole app runs off `localStorage` with seeded data. See [Demo Mode](#demo-mode) below.

## Tech Stack

- **React 19** + **React Router 7** (`createBrowserRouter`, lazy-loaded route bundles)
- **Vite 8** — dev server, build tooling, `@vitejs/plugin-react`
- **TypeScript ~6.0** — strict mode (`noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`), bundler module resolution, `@/*` path alias mapped to `src/*`
- **Tailwind CSS v4** — CSS-native `@theme` bridge (no `tailwind.config.js`), design tokens in `src/app/styles/`
- **TanStack Query v5** — server-state fetching, caching, and mutations
- **React Hook Form + Zod** (via `@hookform/resolvers`) — form state and validation
- **better-auth** (React client) — admin authentication, isolated under `/api/admin-auth`
- **Recharts** — Spend vs Save (Weekly) bar chart and Spent vs Saved (All Time) pie chart on the dashboard
- **date-fns**, **lucide-react**, **react-error-boundary**, **@dr.pogodin/react-helmet**

## Scripts

| Script            | Command                | Purpose                                                  |
| ----------------- | ---------------------- | -------------------------------------------------------- |
| `npm run dev`     | `vite`                 | Start the dev server                                     |
| `npm run build`   | `tsc -b && vite build` | Type-check project references, then build for production |
| `npm run lint`    | `eslint .`             | Lint the project                                         |
| `npm run preview` | `vite preview`         | Preview the production build locally                     |
| `npm run format`  | `prettier --write .`   | Format the codebase                                      |

## Environment Variables

Copy `.env.example` to `.env`. Per Vite's convention, only `VITE_`-prefixed variables reach client code.

| Variable         | Default | Description                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_DEMO_MODE` | `false` | When `true`, every feature's `*.api.ts` routes CRUD through `localStorage` (see `src/app/features/*/*.demo.ts`) instead of the Express API, and `admin-auth-client.lib.ts` swaps in a fixed-credential demo auth client (`src/infra/modules/auth/demo/demo-auth.lib.ts`). Purely client-side — no server or database is touched either way. |

## Routes

Every route lives under one admin shell (`AdminAuthLayout` → `AdminPublicRoute` / `AdminProtectedRoute` → `AdminDashboardLayout`); there is no separate customer-facing portal.

| Path                | Page             | Guard                                                       |
| ------------------- | ---------------- | ----------------------------------------------------------- |
| `/`                 | Login            | Public — redirects to `/dashboard` if already authenticated |
| `/dashboard`        | Dashboard        | Protected                                                   |
| `/income`           | Income           | Protected                                                   |
| `/expenses`         | Expenses         | Protected                                                   |
| `/settings/account` | Account Settings | Protected                                                   |
| `*`                 | 404              | —                                                           |

Route path constants live in `src/app/routes/routes.constants.ts`; the router config is in `src/app/routes/router.tsx`, with page bundles lazy-loaded via `src/app/routes/lazy-pages.tsx`.

## Project Structure

```
src/
├── app/
│   ├── components/       UI primitives (buttons, forms, data-display, overlay, ...) and the admin shell (Navbar, Sidebar, layout)
│   ├── constants/         Shared UI-facing constants (e.g. the activity-type map)
│   ├── contexts/          App-wide React contexts (e.g. ToastContext)
│   ├── features/          Feature modules — dashboard, income, expenses, settings/account
│   │   └── <feature>/
│   │       ├── <feature>.api.ts        Routes to demo (localStorage) or the live API based on env.isDemoMode
│   │       ├── <feature>.demo.ts       localStorage-backed CRUD + seed data for demo mode
│   │       ├── <feature>.queries.ts    TanStack Query read hooks
│   │       ├── <feature>.mutations.ts  TanStack Query write hooks (invalidate dashboard + own list)
│   │       ├── <feature>.schema.ts     Zod form schemas
│   │       ├── <feature>.constants.ts  Base API path + query keys
│   │       └── <feature>.types.ts      Types mirroring the server's mapper response shape
│   ├── guards/             AdminProtectedRoute / AdminPublicRoute
│   ├── pages/              Route-level view components
│   ├── routes/             Router config, route constants, lazy page bundles
│   └── styles/             Tailwind v4 theme bridge, design tokens, base/utilities/animations CSS
├── infra/
│   ├── core/               Env config, generic utils (cn, polymorphic component helpers)
│   ├── lib/                HTTP client (fetch-based, with timeout/abort handling), localStorage demo-collection helpers
│   └── modules/auth/       better-auth admin client, demo auth client, session validation, Zod auth schemas
├── assets/                 Static assets (logo)
├── main.tsx                App entry: providers (QueryClient, Helmet, ErrorBoundary, ToastProvider) + <App />
└── vite-env.d.ts           SVG/env typing augmentations
```

## Demo Mode

Every feature's `*.api.ts` checks `env.isDemoMode` (from `src/infra/core/config/env.config.ts`) and either calls the live Express API via `apiClient` (`src/infra/lib/http/api-client.lib.ts`) or the matching `*.demo.ts` module, which persists data in `localStorage` through the shared helpers in `src/infra/lib/storage/local-storage.lib.ts`.

Demo data is deterministically seeded with a mulberry32 PRNG on first load, so the dashboard, income, and expense lists never start empty — recurring items get open periods, one-time items get scattered past dates, and an activity log is backfilled to match. Demo login credentials are shown directly on the login page whenever `VITE_DEMO_MODE=true`.

## Business Logic Reference

Balance, step-based accrual, runway/growth projection, savings rate, and all-time totals are computed server-side in production, and mirrored client-side in `dashboard.demo.ts` for demo mode — `dashboard.demo.ts` already returns the same `weeklySpendVsSave` shape as production, computed via the identical rolling-bucket, step-accrual algorithm. Accrual is step-based, not continuous: a recurring entry only contributes its amount once a full billing period has elapsed since that period's start date. The web app's only independent math is presentational — the Savings Rate percentage and the Spent vs Saved pie-chart split, both simple derivations from `totalIncome`/`totalExpenses` in `src/app/pages/dashboard.tsx` — plus rendering the server-provided `weeklySpendVsSave` series as a bar chart (`BarChart` with two `Bar` series, spend and save, grouped per week).
