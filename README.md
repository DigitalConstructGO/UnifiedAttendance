# UnifiedAttendance

An all-in-one office attendance and business operations platform. It
connects biometric attendance, employee management, schedules, supervised corrections,
reporting, client management, sales, contracts, and invoicing in one modular full-stack
application, for HR/attendance staff, branch managers, and company owners.

Raw device punches are preserved immutably; every correction is recorded beside the original
with an auditable trail, never in place of it. See [docs/architecture.md](docs/architecture.md)
for the reasoning behind that and the rest of the system design.

## Docs

- **[docs/onboarding.md](docs/onboarding.md)** — environment setup, running the app, testing,
  common tasks. Start here if you're new.
- **[docs/architecture.md](docs/architecture.md)** — system design, request lifecycle, access
  control, the attendance derivation pipeline, and key trade-offs.
- **[docs/api.md](docs/api.md)** — full REST endpoint reference for `/api/v1/*`.
- **[CONTEXT.md](CONTEXT.md)** — domain glossary (read before naming anything new).
- **[PRODUCT.md](PRODUCT.md)** — product positioning, users, principles.
- **[CLAUDE.md](CLAUDE.md)** — repo structure and coding conventions.

## Tech Stack

- **TypeScript** monorepo (pnpm + Turborepo)
- **Next.js** — the one app, owning pages, REST routes, and device-ingestion routes
- **TailwindCSS** + **shadcn/ui** — UI
- **REST API** — versioned JSON endpoints under `/api/v1`, typed end to end via
  `apps/web/src/lib/api/`
- **Drizzle** + **PostgreSQL** — schema and system of record
- **Better Auth** — session-cookie authentication
- **Cloudinary** — private document/photo storage with signed URLs
- **Nodemailer** — transactional email over the operator's own SMTP server
- **pino** — structured logging (wired into `route()`); **prom-client** is present but
  not yet served anywhere

## Quick start

```bash
pnpm install
pnpm db:start                 # start local Postgres (docker compose)
pnpm db:push                  # apply schema
pnpm rbac:seed                # permissions, the four system roles, and their grants
pnpm dev
```

Then create your first login. There is no sign-up screen and no bootstrap script, so this is a
two-step manual process — sign up through better-auth, then grant yourself the Super
Administrator role in SQL:

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

Open [http://localhost:3001](http://localhost:3001). First run walks you through `/setup` to
create your organization and first branch. For env var requirements and the reasoning behind
each step above, see **[docs/onboarding.md](docs/onboarding.md)**.

## Project Structure

```
UnifiedAttendance/
├── apps/
│   └── web/          # The one app — Next.js pages, /api/v1/* routes, /iclock/* device routes
├── packages/
│   ├── api/           # Business logic: modules/<domain>/service.ts, validations, RBAC, errors
│   ├── auth/          # Better Auth configuration
│   ├── config/         # Shared TS/ESLint config
│   ├── db/             # Drizzle schema & migrations
│   └── env/            # Validated environment variables (@t3-oss/env-core)
└── docs/               # architecture.md, api.md, onboarding.md
```

## Available Scripts

- `pnpm dev` — start every package's dev server (web on port 3001); `pnpm dev:web` for just the app
- `pnpm build` — build all apps
- `pnpm check-types` — type-check every package
- `pnpm test` — run the web and API test suites (API tests use a real Postgres via Testcontainers)
- `pnpm lint` / `pnpm format` — Prettier + ESLint
- `pnpm db:push` / `pnpm db:migrate` — apply schema changes; `pnpm db:generate` to write a migration
- `pnpm db:studio` — open Drizzle's database UI
- `pnpm db:start` / `pnpm db:stop` / `pnpm db:down` — start/stop/remove the local dev Postgres container
- `pnpm rbac:seed` — seed the permission catalog, the four system roles, and their grants
