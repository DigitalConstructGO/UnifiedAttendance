# Onboarding Guide

Welcome to UnifiedAttendance (Digital Construct). This walks through getting the app running
locally, the systems it's built from, and the workflows you'll use day to day.

## 1. Prerequisites

- **Node.js** and **pnpm 10** (`packageManager: "pnpm@10.33.0"` in the root `package.json` — use
  [corepack](https://nodejs.org/api/corepack.html) or install that exact major version)
- **Docker**, running — used for the local Postgres, and by the test suite via Testcontainers
- A **Cloudinary** account (cloud name + API key/secret) if you'll be exercising document/photo
  upload features — see [§3](#3-environment-variables)

## 2. Clone and install

```bash
git clone <repo-url> UnifiedAttendance
cd UnifiedAttendance
pnpm install
```

This is a pnpm/Turborepo monorepo (`apps/*`, `packages/*` workspaces). `pnpm install` at the
root installs everything for every app and package at once.

## 3. Environment variables

There is currently no `.env.example` checked into the repo, so create `apps/web/.env` by hand.
These are validated by `packages/env/src/server.ts` (via `@t3-oss/env-core`) and are required
for the app to boot at all:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `BETTER_AUTH_SECRET` | yes | ≥ 32 characters |
| `BETTER_AUTH_URL` | yes | Must be a valid URL, e.g. `http://localhost:3001` |
| `CORS_ORIGIN` | yes | Must be a valid URL — better-auth's `trustedOrigins` |
| `NODE_ENV` | no | `development` \| `production` \| `test`, defaults to `development` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | no | Optional in the schema, but **all five** must be set for email to work — `createMailer()` throws if any is missing. Port 465 turns on implicit TLS |

A few more are read directly (`process.env.X`, not schema-validated) by specific features —
missing ones won't stop the app from starting, but will break the feature that needs them:

| Variable | Used for |
|---|---|
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Document/photo upload and signed URLs (`apps/web/src/lib/storage/`) — required for the workforce-documents and client-documents endpoints to work |
| `LOG_LEVEL`, `PINO_PRETTY` | Logging verbosity/formatting (`apps/web/src/lib/logger.ts`) |
| `METRICS_PREFIX`, `METRICS_PATH`, `METRICS_PORT` | Read by `apps/web/src/lib/metrics.ts` — but nothing imports that module and no `/metrics` route exists, so these have no effect today |
| `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_LOGO_URL`, `NEXT_PUBLIC_APP_TAGLINE` | Client-visible branding overrides |

A minimal local `apps/web/.env` to get the app running (without document uploads or email):

```bash
DATABASE_URL=postgres://postgres:password@localhost:5432/UnifiedAttendance
BETTER_AUTH_SECRET=dev-secret-change-me-to-something-32-chars-plus
BETTER_AUTH_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001
```

(These match the credentials the dev Postgres container is already configured with — see
below.)

## 4. Start Postgres

The dev database is defined in the root `docker-compose.yml` (Postgres 16, database
`UnifiedAttendance`, user/password `postgres`/`password`, port `5432`):

```bash
pnpm db:start        # docker compose up -d, via packages/db
```

Then apply the schema:

```bash
pnpm db:push          # drizzle-kit push — fast, for local dev
# or, to apply the committed migration history instead:
pnpm db:migrate
```

`pnpm db:studio` opens Drizzle's database UI if you want to poke at tables directly.

> Don't confuse this with `docker-compose.test.yml` — that stack is only ever started by the
> test suite via Testcontainers, uses different credentials, and never touches your dev data.

## 5. Seed RBAC and create your first login

First seed RBAC. `packages/api/scripts/seed.ts` is the only script in the repo, and it is wired
up as a pnpm script:

```bash
pnpm rbac:seed     # → turbo -F @UnifiedAttendance/api rbac:seed → tsx scripts/seed.ts
```

It states each system role in full: it inserts every code in `PERMISSIONS`, deletes any
permission row the code no longer lists, upserts the four system roles (**Super
Administrator**, **Admin**, **Manager**, **HR**), and replaces each role's grants to match
`ROLE_PERMISSIONS` exactly. Safe — and intended — to re-run after every permission change.

**Creating the first login is a manual two-step, and this is a known gap.** There is no sign-up
screen, no `rbac:seed-admin` script, and no "first user becomes admin" bootstrap;
`POST /api/v1/access/users` — the endpoint that would create one — is itself gated by
`requireSuperAdmin`. So create the account through better-auth's own sign-up endpoint
(email/password is enabled and email verification is not required), then insert the role
assignment directly:

```bash
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H 'content-type: application/json' \
  -d '{"name":"Your Name","email":"you@example.com","password":"your-password"}'
```

```sql
-- psql "$DATABASE_URL"
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM "user" u, roles r
WHERE u.email = 'you@example.com' AND r.name = 'Super Administrator'
ON CONFLICT (user_id) DO UPDATE SET role_id = EXCLUDED.role_id;
```

`user_roles` is keyed on `user_id` alone — one role per user — which is why that upsert also
works to *change* someone's role. Once you have one Super Administrator, every further user can
be created from the UI (`/dashboard/access`, backed by `POST /api/v1/access/users`).

> `requirePermission` caches a user's grants for 60 seconds, so a role change made in SQL can
> take up to a minute to take effect in a running server.

There are no demo/seed-data scripts. `seed-employees.ts`, `seed-clients.ts`, `seed-stress.ts`,
and `sync-role-permissions.ts` were described by an earlier draft of this guide but do not
exist.

## 6. Run the app

```bash
pnpm dev            # every package's dev script, in parallel/watch mode
# or just the web app:
pnpm dev:web
```

Open **http://localhost:3001** (the port is set explicitly in `apps/web/package.json`'s `dev`
script, not a Next.js default). First run with no organization yet will route you through
`/setup` (`POST /api/v1/setup`), which bootstraps the organization, its first branch, and a
working-day schedule in one step.

## 7. Key systems and how they connect

Read [architecture.md](./architecture.md) for the full picture; the short version:

- **`apps/web`** is the only app — it owns the Next.js pages, the `/api/v1/*` REST routes, the
  `/iclock/*` device-protocol routes, and better-auth's callback routes.
- **`packages/api`** holds all business logic as plain `(ctx, input)` service functions —
  no HTTP in it, importable from a Server Component just as easily as from a route handler.
  One barrel, `packages/api/src/index.ts`, exports everything.
- **`packages/db`** is the Drizzle schema and generated migrations; `packages/auth` configures
  better-auth (email/password only right now, session-cookie-cached for 5 minutes).
- Adding an endpoint touches exactly three files, in order — see
  [CLAUDE.md's "API layout" section](../CLAUDE.md#api-layout) for the walkthrough
  (validation schema → service function → route handler).
- RBAC enforcement is layered but only two layers are real: `route()`'s session check, and
  `requirePermission` in `packages/api/src/modules/shared/guards.ts`. Everything else (proxy
  redirects, dashboard-page checks, the sidebar) is cosmetic. See
  [architecture.md's access-control section](./architecture.md#access-control) — in particular,
  branch-scoping is not enforced yet even though many call sites pass a `branchId`.

## 8. Common tasks

**Add a new API endpoint** — three files, in this order:
1. `packages/api/src/validations/<domain>.ts` — the zod input schema
2. `packages/api/src/modules/<domain>/service.ts` — the `(ctx, input)` function, exported from
   `packages/api/src/index.ts`
3. `apps/web/src/app/api/v1/.../route.ts` — `export const GET = route({ input, handler })`

Then add the endpoint's permission code to `PERMISSION_GROUPS` in
`packages/api/src/rbac/permissions.ts`, grant it to the roles that need it in
`ROLE_PERMISSIONS`, and re-run the seed script from [§5](#5-seed-rbac-and-create-your-first-login).

**Call the API from the frontend** — use the typed client in `apps/web/src/lib/api/`, which
mirrors the same domain split and infers its types from the service return types, rather than
hand-rolling `fetch` calls.

**Run the linter/formatter**:

```bash
pnpm lint            # prettier --check . && eslint .
pnpm format           # prettier --write .
pnpm check-types      # tsc --noEmit, across every package
```

## 9. Testing

```bash
pnpm test    # pnpm --filter web test && pnpm --filter @UnifiedAttendance/api test
```

- **`apps/web`** tests are plain Vitest + Testing Library (jsdom environment), under
  `apps/web/test/unit/` — no database involved.
- **`packages/api`** tests run against a *real* Postgres, spun up automatically by Testcontainers
  (`packages/api/test/setup.ts`, a Vitest `globalSetup`): it brings up `docker-compose.test.yml`,
  points `DATABASE_URL` at the container's randomly-assigned host port, and applies every
  Drizzle migration from `packages/db/src/migrations` — so the test schema can never drift from
  what migrations actually produce. Nothing needs to be started by hand; just have Docker
  running. Because every test file in the package shares the one container, `fileParallelism`
  is disabled.
- Call `resetDatabase()` (from `packages/api/test/fixtures.ts`) in `beforeEach` for a clean
  slate — it truncates every table, re-seeds the RBAC catalog, and clears the in-process
  permission/branch caches so a previous test's state can't bleed into the next one.
- Playwright is configured at the repo root (`playwright.config.ts`) for end-to-end coverage.

## 10. Where to look for more

- [README.md](../README.md) — quick start and available scripts
- [architecture.md](./architecture.md) — system design, data flow, key trade-offs
- [api.md](./api.md) — full REST endpoint reference
- [CONTEXT.md](../CONTEXT.md) — the project's domain glossary (read this before naming anything
  new — it calls out terms to avoid, like "Lead" as an entity name instead of a pipeline stage)
- [PRODUCT.md](../PRODUCT.md) — product positioning, users, and principles
- [DESIGN.md](../DESIGN.md) — the shared design-token language (colors, type, spacing)
- [CLAUDE.md](../CLAUDE.md) — repo structure and coding conventions
