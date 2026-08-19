# Architecture

## Context and goals

UnifiedAttendance (customer-facing name: **Digital Construct**) is an all-in-one office
attendance and business operations platform. It connects biometric attendance, employee
management, schedules, supervised corrections, reporting, client management, sales, contracts,
and invoicing in one modular full-stack application, for HR/attendance staff, branch managers,
and company owners.

Two goals shape most of the design decisions below:

- **Raw attendance data is a source of truth.** Biometric punches from ZKTeco devices are
  stored immutably and never edited. Every correction to what "actually happened" is recorded
  beside the original event with an auditable decision trail, not in place of it.
- **One shared foundation, several independent modules.** Attendance, workforce, and
  client/CRM/billing are separate domains that share organizations, branches, people, and
  access control, without collapsing into one undifferentiated system. See
  [CONTEXT.md](../CONTEXT.md) for the domain glossary that keeps the modules' vocabulary
  consistent.

## High-level design

```
                          ┌────────────────────────────────────────┐
                          │              apps/web                  │
                          │           (Next.js, one app)            │
                          │                                          │
  Browser / dashboard ───▶│  App Router pages   ── zustand/TanStack  │
                          │  /api/v1/*          ── route() wrapper   │
  ZKTeco attendance  ────▶│  /iclock/*          ── ADMS protocol     │
  devices (unauth'd)      │  /api/auth/*        ── better-auth       │
                          └───────────────┬──────────────────────────┘
                                          │ imports (no HTTP)
                          ┌───────────────▼──────────────────────────┐
                          │              packages/api                │
                          │  modules/<domain>/service.ts  (behaviour) │
                          │  validations/<domain>.ts      (zod)       │
                          │  rbac/permissions.ts          (RBAC)      │
                          │  errors.ts                    (ApiError)  │
                          └───────────────┬──────────────────────────┘
                                          │ Drizzle queries
                          ┌───────────────▼──────────────────────────┐
                          │              packages/db                  │
                          │   schema/*.ts   +   migrations/*.sql      │
                          └───────────────┬──────────────────────────┘
                                          │
                                   PostgreSQL (system of record)

          packages/auth  ── better-auth, session cookies, Postgres-backed
          Cloudinary     ── document/photo storage, private delivery, signed URLs
          Resend         ── transactional email
          prom-client    ── /metrics for Grafana/Prometheus scraping
          pino           ── structured JSON logging
```

`apps/web` is the only app in the monorepo, and it owns everything HTTP: page rendering, the
REST API route handlers, the device-ingestion endpoints, and authentication's callback routes.
Everything under `packages/` is imported directly — there is no internal network hop between
"frontend" and "backend"; `packages/api` service functions are plain `(ctx, input)` functions
that a Server Component can call as easily as a route handler can (see
`apps/web/src/lib/access-server.ts`).

## Request lifecycle (`/api/v1/*`)

Every REST endpoint is built with `route()` in `apps/web/src/lib/route.ts`, the single seam a
request crosses:

1. Generate a `requestId` (`crypto.randomUUID()`), attached to every response as
   `x-request-id` and to every error payload — the thread to pull when a user reports a
   problem.
2. Resolve the session via `createContext(request)` → better-auth `getSession`. Anonymous
   callers are rejected with `401` unless the route was declared `access: "public"` (only
   `/api/v1/health` and the device-ingestion routes work this way).
3. Read input — JSON body for `POST`/`PUT`/`PATCH`, query string otherwise — and merge in any
   dynamic path segments (`[employeeId]` etc.) over the top.
4. Validate against the route's zod schema. A failure returns `422 UNPROCESSABLE_CONTENT` with
   a treeified zod error — deliberately *after* the auth check, so bad input from an anonymous
   caller still gets `401`, not `422`, keeping validation detail behind the session.
5. Call the handler, which is almost always a one-line call into a `packages/api` service
   function.
6. Catch anything thrown. A thrown `ApiError` (`badRequest`/`forbidden`/`notFound`/`conflict`/
   `unprocessableContent`/`unauthorized` from `packages/api/src/errors.ts`) maps straight to its
   status code and JSON body. A handful of raw Postgres error codes are translated too — foreign
   key violations, unique violations, and check violations all become a `409 CONFLICT` with a
   plain-language message, so services don't have to special-case "this would orphan a row" by
   hand.

Services never build a `Response` themselves; they throw. That is what keeps
`packages/api` free of any HTTP concept and safe to call from a Server Component.

## Access control

RBAC is layered, and only the last two layers are actually enforced:

| Layer | File | What it does | Trustworthy? |
|---|---|---|---|
| Session-cookie redirect | `apps/web/src/proxy.ts` | Optimistic check so a logged-out user is bounced to `/login` before a page even renders | No — cosmetic, Next 16's `proxy.ts` (not `middleware.ts`) |
| Dashboard pages | server components | Re-checks permission, redirects to `/no-access` | No — UX only |
| Sidebar | client component | Hides links the user can't use | No — cosmetic |
| `route()` | `apps/web/src/lib/route.ts` | Rejects anonymous callers | **Yes** |
| `requirePermission` | `packages/api/src/modules/shared/guards.ts` | Checks the caller's granted permissions against the permission the endpoint requires | **Yes** — the final authority |

Permissions are a fixed catalog (`packages/api/src/rbac/permissions.ts`): one
`PERMISSION_GROUPS` map produces codes like `employees.create` or `invoices.void` for every
domain module. Four fixed system roles — **Super Administrator**, **Admin**, **Manager**, **HR**
— are seeded with a fixed grant set (`ROLE_PERMISSIONS`); Super Administrator and Admin get
every permission, HR gets workforce + attendance + reports, Manager gets workforce + the full
client/CRM/billing surface. Additional custom roles can be created at runtime through
`/api/v1/access/roles`, gated by `requireSuperAdmin`.

`requirePermission(ctx, permission, branchId)` caches a user's granted-permission list for 60
seconds (`GRANT_CACHE_TTL_MS`) to avoid a four-table join on every request — the cost is that a
role change can take up to a minute to take effect. **The `branchId` argument is currently
ignored.** Most call sites already pass one, in anticipation of branch-scoped RBAC, but
enforcement today is role-wide: a Manager with `clients.update` can update a client in any
branch, not just their own. Treat authorization as role-wide until that changes, and don't write
code that assumes branch scoping is enforced.

## Domain model

Two domain clusters share the organization/branch/person/RBAC foundation:

- **Workforce** — Person → Employee → Employment Period (effective-dated branch/department/
  position assignment) → Employment Contract (with a Cosigner) → private Employee Document.
  Attendance layers on top: immutable Attendance Events from devices, derived Attendance Days,
  and two kinds of overlay — attributable Manual Attendance Entries and reviewed Attendance
  Corrections — that affect a day only when applied/approved.
- **Client / CRM** — Client ← Opportunity (moving through ordered Pipeline Stages, with an
  immutable Opportunity Stage Transition history) → conversion into a Client relationship →
  Project / Commercial Contract → Invoice → Invoice Payment. Client Health, Client Directory
  Status, Invoiced/Collected Revenue, and Client Timeline are all *derived* projections, not
  stored fields — see [CONTEXT.md](../CONTEXT.md) for the full, precise vocabulary (it
  explicitly calls out terms to avoid, like using "Lead" as the aggregate name instead of a
  pipeline stage).

Schema files under `packages/db/src/schema/` mirror this split (`employees.ts`,
`employment-contracts.ts`, `attendance-*.ts` vs. `clients.ts`, `client-sales.ts`,
`client-contracts.ts`, `client-billing.ts`, ...), all exported through one barrel,
`packages/db/src/schema/index.ts`.

For the internal business logic behind each `packages/api/src/modules/<domain>/` folder — not
just what an endpoint does, but the invariants, transactions, and edge cases the code actually
enforces — see the module-by-module docs in [docs/modules/](./modules/):

| Module | Covers |
|---|---|
| [workforce](./modules/workforce.md) | Employees, employment periods, contracts, cosigners, documents |
| [attendance](./modules/attendance.md) | Events, derived days, the daily register, manual entries, push batches |
| [corrections](./modules/corrections.md) | Attendance corrections — applied immediately, no approval queue |
| [devices](./modules/devices.md) | Device registry, badge enrollment, the ADMS protocol, device health |
| [clients](./modules/clients.md) | The full CRM/sales/billing domain — clients, opportunities, projects, contracts, invoices |
| [organization](./modules/organization.md) | Org record, branches, working-day schedules, holidays, `/setup` |
| [access](./modules/access.md) | RBAC administration — roles, permission grants, users, assignments |
| [overview](./modules/overview.md) | The operations dashboard aggregator |
| [reports](./modules/reports.md) | The attendance summary report and the "expected days" algorithm |

## Attendance derivation pipeline

### Why it's computed, not stored

A day's attendance status (present/late/absent/partial/missing-punch) isn't a fact a device can
report — it's a judgment that depends on several things that can each change independently:

- **Raw punches** — immutable, but there can be several per day, or none.
- **Schedule context** — is this a working day for this branch, what are its hours, is it a
  holiday.
- **Corrections** — a reviewed dispute over a specific punch, applied only once approved.
- **Manual entries** — a staff-authored punch for when the device missed one.

Corrections and manual entries can be added or edited *after* the original punches came in, so
there's no single moment when a day's status becomes final. If attendance status were written
once at punch time, every later correction or manual entry would require going back and
patching whatever record already exists — easy to miss, hard to trust. Instead, the day's
outcome is treated as something to recompute from scratch on demand: raw events, schedule, and
overlays go in; one derived row comes out. That keeps "what was recorded"
(`attendanceEvents`, never mutated after insert) and "what we've decided it means"
(`attendanceDays`, freely recomputed) as two separate, always-reconcilable layers.

### How `deriveAttendanceDay` computes it

`deriveAttendanceDay(ctx, { employeeId, attendanceDate })`
(`packages/api/src/attendance/derive-day.ts`) is the single entry point. For one employee and one
date:

1. **Resolve the day's context** (`day-context.ts`) — find which branch the employee was
   assigned to *on that date* (from employment period history, not just their current branch),
   that branch's timezone and weekly schedule for the weekday, and whether it's a holiday.
   Produces `dayType` (`working_day` / `weekend` / `holiday`) and a `dayWindow`: the day's actual
   start/end instants in the branch's timezone, plus `expectedStart`/`expectedEnd` from the
   schedule. The timezone conversion is done in Postgres (`at time zone`) rather than JS, so DST
   and offsets are handled once, correctly, in one place. `branch_working_days.weekday` is
   stored Monday-first (matching how the organization screen writes it); reading it with JS's
   Sunday-first `getUTCDay()` would shift every day off by one, so `mondayFirstWeekday()`
   corrects for that explicitly.
2. **Load the three raw inputs** for that window: every `attendanceEvents` row, every
   `attendanceCorrections` row, every `manualAttendanceEntries` row for that employee and date.
3. **Reduce events to `firstIn`/`lastOut`** — the *first* event with `direction: "in"` and the
   *last* event with `direction: "out"`. Punches in between are kept in `attendanceEvents` but
   don't affect the outcome.
4. **Fold in overlays, oldest first** (`overlays.ts`) — manual entries apply, then corrections on
   top, each a small state machine over `{ firstIn, lastOut, outcomeOverride, latenessExcused }`:
   `check_in`/`check_out` (manual) and `add_check_in`/`adjust_check_in` etc. (corrections) replace
   a time; `mark_absent` wipes both times and forces the outcome to `absent`; `mark_present`
   forces `present` without touching times; `excuse_lateness` (corrections only) zeroes lateness
   without changing the check-in time. Entries are applied oldest → newest, so the most recent
   statement about a punch wins — re-recording a wrong manual entry replaces it rather than
   stacking.
5. **Derive the outcome** — if nothing overrode it: `present` if both `firstIn` and `lastOut`
   survive, `partial` if only one does, `unknown` if there were events but neither survived (e.g.
   two punches in the same direction), `absent` if there were no events at all.
6. **Compute the numbers** — `lateMinutes` (minutes `firstIn` is after `expectedStart`, `0` if
   excused), `earlyDepartureMinutes` (minutes `lastOut` is before `expectedEnd`), `workedMinutes`
   (raw minutes between `firstIn` and `lastOut`).
7. **Upsert** one `attendanceDays` row keyed on `(employeeId, attendanceDate)` —
   `onConflictDoUpdate`, so re-running this just overwrites the previous derived row. If there's
   nothing at all (no events, no manual entries, no corrections), any existing row is deleted
   instead of storing an empty one.

The whole function is pure with respect to those three tables plus the schedule: same inputs,
same output, every time. That's what makes it safe to call as often as needed — on every
correction create/update/delete (`packages/api/src/modules/corrections/service.ts`), or
explicitly via `POST /api/v1/attendance/days/recompute` — rather than something that has to be
called exactly once and then trusted forever.

## Device ingestion (`/iclock/*`)

ZKTeco readers speak an unauthenticated push protocol (ADMS): a device identifies itself only by
serial number in the query string, with no credential the server could check. The routes under
`apps/web/src/app/iclock/` (`cdata`, `getrequest`, `devicecmd`) implement that protocol directly,
outside `/api/v1` and outside `route()`:

- `GET /iclock/cdata` — handshake; a known device gets back the config line
  (`Realtime=1`, poll delay, etc.) that makes it push punches within seconds instead of batching
  them for hours.
- `POST /iclock/cdata` — the actual attendance/operation upload, tab-separated text (not JSON).
  The reader only understands a bare `OK` reply — including when the batch couldn't be parsed,
  because a batch stored-but-unparseable and answered anything other than `OK` gets resent
  forever and blocks the ones behind it.
- `GET /iclock/getrequest` — the command queue a reader polls on a timer; also doubles as a
  liveness signal, since a device that pushes nothing all day still polls this. Nothing enqueues
  device commands yet, so the answer is always `OK`.
- `POST /iclock/devicecmd` — where a reader would report the result of a command; unused today
  since nothing issues commands, kept because a reader answering here confirms it's reachable.

Every attendance event a device pushes is preserved verbatim in `attendancePushBatches` before
anything is parsed into `attendanceEvents`, and each device's `lastSeenAt` is updated on every
contact (handshake or upload) so the dashboard's device-health view reflects readers that are
online but idle, not just ones that are punching. Because the protocol has no authentication,
these endpoints are trusted only because of network placement — they must sit behind a perimeter
that only attendance devices can reach, never exposed the way `/api/v1` is.

## Storage, email, and observability

- **Documents and photos** — Cloudinary, `type: "private"` delivery, resource type `image`
  (Cloudinary treats PDFs as images for this purpose). `apps/web/src/lib/storage/` wraps
  signed-upload and signed-download URL generation; `client-documents`,
  `client-document-versions`, and `workforce-documents` endpoints hand back a signed upload URL
  alongside the metadata row they create, and finalize only after checking the stored file
  matches what was declared.
- **Email** — Nodemailer against the operator's own SMTP server, wrapped in
  `packages/api/src/mailer.ts` and injected on `Context` (`packages/api/src/context.ts`) the
  same way `db` is, so tests can swap in a fake mailer. Configured via `SMTP_HOST`/`SMTP_PORT`/
  `SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`.
- **Logging** — pino, `apps/web/src/lib/logger.ts`, JSON in production, pretty-printed in
  development unless `PINO_PRETTY=false`.
- **Metrics** — `prom-client`, `apps/web/src/lib/metrics.ts`, served for Grafana/Prometheus to
  scrape.
- **Scheduled/background work** — `node-cron`, registered once per server instance from
  `apps/web/src/instrumentation.ts`'s `register()` hook (guarded against Next re-invoking it,
  and against non-Node runtimes). Jobs build a session-less `Context` directly and call a
  service function, bypassing the RBAC/HTTP layer entirely — appropriate only for trusted
  background code with no user session to check. Currently used for the notifications
  late-arrival/absence scans, `packages/api/src/modules/notifications/`. `ioredis` is present in
  `apps/web/package.json` and BullMQ is part of the intended stack (see
  [CLAUDE.md](../CLAUDE.md)) for heavier background-job needs (retries, persistence, multiple
  workers), but as of this writing neither is wired into any application code — node-cron was
  chosen for the notifications feature instead, since its needs (a handful of fixed-interval
  scans, single web-server instance) didn't warrant standing up a queue.



## Related docs

- [README.md](../README.md) — quick start
- [docs/onboarding.md](./onboarding.md) — environment setup, day-to-day workflows
- [docs/api.md](./api.md) — full endpoint reference
