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

A few more are read directly (`process.env.X`, not schema-validated) by specific features —
missing ones won't stop the app from starting, but will break the feature that needs them:

| Variable | Used for |
|---|---|
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Document/photo upload and signed URLs (`apps/web/src/lib/storage/`) — required for the workforce-documents and client-documents endpoints to work |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Transactional email (`apps/web/src/lib/email.ts`) |
| `LOG_LEVEL`, `PINO_PRETTY` | Logging verbosity/formatting |
| `METRICS_PREFIX`, `METRICS_PATH`, `METRICS_PORT` | `/metrics` endpoint for Grafana/Prometheus |
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

**currently documents `pnpm rbac:seed` and `pnpm rbac:seed-admin <email> <password>
[name]`, but neither exists as a pnpm script today** — worth fixing (either add the scripts, or
correct the docs). The actual scripts live in `packages/api/scripts/` and are run with `tsx`:

```bash
# Seed the permission catalog, the four fixed roles, and each role's grants
pnpm --filter @UnifiedAttendance/api exec tsx scripts/seed.ts

# Create (or update) a user and assign them a role — this is also how you create
# your first Super Administrator login. Role must be one of the ROLES values
# ("Super Administrator", "Admin", "Manager", "HR") — quote it, it has a space.
pnpm --filter @UnifiedAttendance/api exec tsx scripts/assign-role.ts \
  you@example.com "Super Administrator" your-password "Your Name"
```

`assign-role.ts` creates the user through better-auth if they don't exist yet (so the password
hash is one better-auth can actually verify), re-seeds RBAC first, marks the email verified, and
upserts the role assignment — safe to re-run to reset a password or change a role.

Other scripts in `packages/api/scripts/` worth knowing about, all run the same way
(`pnpm --filter @UnifiedAttendance/api exec tsx scripts/<name>.ts`):

- `seed-employees.ts` — demo organization/branches/departments/positions/employees with a
  working week
- `seed-clients.ts` — demo CRM data (industries, client types, pipeline stages, contracts, ...);
  needs a user to already exist first
- `seed-stress.ts` — load-test data generator: `seed-stress.ts [employees] [days]`, supports
  `--teardown`
- `sync-role-permissions.ts` — re-syncs `role_permissions` to match the code-defined grants,
  standalone from a full `seed.ts` run

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
