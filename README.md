# UnifiedAttendance

**Digital Construct** — an all-in-one office attendance and business operations platform. It
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
- **[docs/modules/](docs/modules/)** — module-by-module internals: the business rules,
  transactions, and edge cases behind each `packages/api/src/modules/<domain>/` folder.
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
- **Resend** — transactional email
- **pino** + **prom-client** — logging and metrics (Grafana/Prometheus)

## Quick start

```bash
pnpm install
pnpm db:start                 # start local Postgres (docker compose)
pnpm db:push                  # apply schema
pnpm --filter @UnifiedAttendance/api exec tsx scripts/seed.ts
pnpm --filter @UnifiedAttendance/api exec tsx scripts/assign-role.ts \
  you@example.com "Super Administrator" your-password "Your Name"
pnpm dev
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
│   ├── db/             # Drizzle schema & migrations
│   └── env/            # Validated environment variables (@t3-oss/env-core)
└── docs/               # architecture.md, api.md, onboarding.md
```

## Available Scripts

- `pnpm dev` — start every package's dev server (web on port 3001)
- `pnpm build` — build all apps
- `pnpm check-types` — type-check every package
- `pnpm test` — run the web and API test suites (API tests use a real Postgres via Testcontainers)
- `pnpm lint` / `pnpm format` — Prettier + ESLint
- `pnpm db:push` / `pnpm db:migrate` — apply schema changes
- `pnpm db:studio` — open Drizzle's database UI
- `pnpm db:start` / `pnpm db:stop` — start/stop the local dev Postgres container
