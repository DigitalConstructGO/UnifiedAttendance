# API Documentation

REST endpoints, versioned under `/api/v1`, JSON over Next.js route handlers. Every route is
built with the `route()` wrapper (`apps/web/src/lib/route.ts`) described in
[architecture.md](./architecture.md#request-lifecycle-apiv1) — read that first for how auth,
validation, and error mapping work; this doc is the endpoint-by-endpoint reference.

The typed browser client that mirrors this same module split lives in
`apps/web/src/lib/api/` — prefer it over hand-written `fetch` calls from frontend code.

This doc covers *what* each endpoint accepts and returns. For *why* — the business rules,
transactions, and edge cases behind each domain module — see [docs/modules/](./modules/),
linked from each section below and indexed in
[architecture.md § Domain model](./architecture.md#domain-model).

## Conventions

**Base URL**: `/api/v1` (e.g. `https://your-host/api/v1/employees`).

**Authentication**: session cookie, set by better-auth (`/api/auth/*`). Every endpoint below
requires a session unless marked **public**. An anonymous request gets `401 UNAUTHORIZED` before
input is even validated — so a bad request from a logged-out caller is always a `401`, never a
`422`.

**Authorization**: most endpoints additionally require a specific permission (see the
`Permission` column). A session without that permission gets `403 FORBIDDEN`. See
[architecture.md](./architecture.md#access-control) for how the permission catalog and roles
work, and note that the `branchId` many endpoints accept for scoping is **not currently
enforced** — permission checks are role-wide today.

**Request format**: `GET`/`DELETE` take input as query-string parameters; `POST`/`PUT`/`PATCH`
take a JSON object body. Dynamic path segments (e.g. `[employeeId]`) are merged into the same
input object, so a schema field named `employeeId` is satisfied by the URL segment automatically.

**Response format**: successful responses are the handler's return value, JSON-encoded, with
status `200` (or `201` for most `POST`s that create a resource — see each table). Every response
carries an `x-request-id` header.

**Error format**:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Employee not found",
    "details": null,
    "requestId": "b3f1..."
  }
}
```

| HTTP status | `code` | Meaning |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed request (e.g. body isn't a JSON object) |
| 401 | `UNAUTHORIZED` | No session, or session required and missing |
| 403 | `FORBIDDEN` | Session lacks the required permission/role |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 409 | `CONFLICT` | Would violate a foreign key, unique, or check constraint — or a domain rule (e.g. voiding an invoice that has payments) |
| 422 | `UNPROCESSABLE_CONTENT` | Zod validation failed; `details` is a treeified zod error |
| 500 | `INTERNAL_SERVER_ERROR` | Unhandled error |

**Pagination**: list endpoints that can return unbounded results take `limit`/`offset` (e.g.
attendance events, push batches, the attendance summary report) or `page`/`pageSize` (the client
directory search). Endpoints without either return their full result set — used only where the
result is inherently small (catalogs, per-branch schedules, etc.).

---

## Table of contents

- [Access & RBAC](#access--rbac)
- [Organization & branches](#organization--branches)
- [Workforce](#workforce)
- [Devices](#devices)
- [Attendance](#attendance)
- [Corrections](#corrections)
- [Reports & dashboard](#reports--dashboard)
- [Clients & CRM](#clients--crm)
- [Health & setup](#health--setup)
- [Device protocol (`/iclock/*`)](#device-protocol-iclock)

---

## Access & RBAC

Module: `packages/api/src/modules/access/service.ts` · Validations: `access.ts` · Internals: [modules/access.md](./modules/access.md)

Everything except `GET /access/me` is gated by `requireSuperAdmin` rather than a granular
permission code — role and permission management is Super Administrator territory only.

| Method | Path | Permission | Body / query | Description |
|---|---|---|---|---|
| GET | `/access/me` | session only | — | Current user's role and permission grants |
| GET | `/access/permissions` | `requireSuperAdmin` | — | Full seeded permission catalog |
| GET | `/access/role-permissions` | `requireSuperAdmin` | — | All role → permission grants |
| GET | `/access/roles` | `requireSuperAdmin` | — | Roles, with permission/user counts |
| POST | `/access/roles` | `requireSuperAdmin` | `name`, `code`, `description?`, `permissionCodes[]` | Create a custom role |
| PATCH | `/access/roles/[roleId]` | `requireSuperAdmin` | `name?`, `description?` | Rename/redescribe a non-system role |
| DELETE | `/access/roles/[roleId]` | `requireSuperAdmin` | — | Archive a role (blocked if system role or still assigned) |
| PUT | `/access/roles/[roleId]/permissions` | `requireSuperAdmin` | `permissionCodes[]` | Replace a role's grants wholesale |
| GET | `/access/users` | `requireSuperAdmin` | — | Users with their role assignment |
| POST | `/access/users` | `requireSuperAdmin` | `name`, `email`, `password`, `roleId` | Create a user + credential account + role assignment |
| GET | `/access/assignments` | `requireSuperAdmin` | — | User ↔ role assignments |
| POST | `/access/assignments` | `requireSuperAdmin` | `userId`, `roleId` | Assign/reassign a user's role |

## Organization & branches

Module: `packages/api/src/modules/organization/service.ts` · Validations: `organization.ts` · Internals: [modules/organization.md](./modules/organization.md)

| Method | Path | Permission | Body / query | Description |
|---|---|---|---|---|
| GET | `/organization` | `organization.read` | — | The single organization record |
| POST | `/organization` | `requireSuperAdmin` | `name`, `code`, `timezone?`, `logoUrl?` | Create the organization (only if none exists) |
| PATCH | `/organization/[id]` | `organization.update` | `name?`, `code?`, `timezone?`, `logoUrl?`, `status?`, `tin?`, `address?` | Update organization details |
| GET | `/organization/letterhead` | session only | — | Name/logo/TIN/address for document letterheads |
| GET | `/branches` | `branches.read` | `archived?` | List branches |
| POST | `/branches` | `branches.create` | `name`, `code`, `address?`, `timezone?` | Create a branch (seeds working days from a reference branch) |
| GET | `/branches/[branchId]` | `branches.read` | — | Get one branch |
| PATCH | `/branches/[branchId]` | `branches.update` | `name?`, `code?`, `address?`, `timezone?`, `status?` | Update a branch |
| DELETE | `/branches/[branchId]` | `branches.delete` | — | Permanently delete an archived branch (blocked if employees/devices remain) |
| POST | `/branches/[branchId]/archive` | `branches.archive` | — | Archive a branch |
| POST | `/branches/[branchId]/restore` | `branches.restore` | — | Restore an archived branch |
| GET | `/branches/[branchId]/working-days` | `branches.read` | — | The branch's 7-day weekly schedule |
| PUT | `/branches/[branchId]/working-days` | `branches.manage_schedule` | `days[7]`: `weekday`, `isWorkingDay`, `openingTime?`, `closingTime?` | Replace the full weekly schedule |
| GET | `/holidays` | `holidays.read` | `branchId?` | List holidays (org-wide if `branchId` omitted) |
| POST | `/holidays` | `holidays.create` | `name`, `holidayDate`, `branchId?` | Create a holiday |
| PATCH | `/holidays/[id]` | `holidays.update` | `name?`, `holidayDate?`, `branchId?` | Update a holiday |
| DELETE | `/holidays/[id]` | `holidays.delete` | — | Delete a holiday |

## Workforce

Departments, positions, employees, employment history, contracts, cosigners, and documents.
Modules: `packages/api/src/modules/workforce/*` · Validations: `workforce.ts` · Internals: [modules/workforce.md](./modules/workforce.md)

| Method | Path | Permission | Body / query | Description |
|---|---|---|---|---|
| GET | `/departments` | `departments.read` | — | List departments |
| POST | `/departments` | `departments.create` | `name`, `branchId?` | Create a department |
| PATCH | `/departments/[id]` | `departments.update` | `name?`, `status?`, `branchId?` | Update a department |
| DELETE | `/departments/[id]` | `departments.delete` | — | Delete a department |
| GET | `/positions` | `positions.read` | — | List job positions |
| POST | `/positions` | `positions.create` | `title`, `description?`, `departmentId?` | Create a position |
| PATCH | `/positions/[id]` | `positions.update` | `title?`, `description?`, `status?`, `departmentId?` | Update a position |
| DELETE | `/positions/[id]` | `positions.delete` | — | Delete a position |
| GET | `/employees` | `employees.read` | `branchId`, `archived?` | List employees for a branch, with signed profile-photo URLs |
| POST | `/employees` | `employees.create` | `person` (name/contact/gender), `employee` (`branchId`, `departmentId?`, `positionId?`, `employeeCode?`, `employmentType`, `hireDate`, `hasFixedSchedule?`) | Create a person + employee + initial employment period (auto-generates employee code) |
| GET | `/employees/[id]` | `employees.read` | — | Get one employee with employment history + signed asset URLs |
| PATCH | `/employees/[id]` | `employees.update` | `person?` (partial), `employee?` (partial, excludes assignment fields) | Update person/employee fields — assignment changes go through the transition endpoint below |
| DELETE | `/employees/[id]` | `employees.delete` | — | Hard-delete an archived employee (blocked if contracts or owned clients exist) |
| POST | `/employees/[id]/archive` | `employees.archive` | — | Archive an employee |
| POST | `/employees/[id]/restore` | `employees.restore` | — | Restore an archived employee |
| GET | `/employees/[id]/employment` | `employment.read` | — | Employment period history |
| POST | `/employees/[id]/employment` | `employment.transition` | `branchId`, `departmentId?`, `positionId?`, `employmentType`, `status`, `effectiveFrom` | Start a new effective-dated employment period (reassignment/status change) |
| GET | `/employment-contracts` | `employment_contracts.read` | `employeeId?` | List employment contracts |
| POST | `/employment-contracts` | `employment_contracts.create` | `contractNumber`, `startsOn`, `endsOn?`, `status?`, `signedOn?`, `notes?`, `employeeId`, `cosigner` (new cosigner object) | Create a contract + cosigner in one transaction |
| PATCH | `/employment-contracts/[id]` | `employment_contracts.update` | partial of create fields | Update a contract |
| DELETE | `/employment-contracts/[id]` | `employment_contracts.delete` | — | Delete a contract |
| GET | `/cosigners` | `cosigners.read` | — | List cosigners |
| POST | `/cosigners` | `cosigners.create` | `fullName`, `phone?`, `workplace?`, ID/badge photo URLs | Create a cosigner |
| PATCH | `/cosigners/[id]` | `cosigners.update` | partial of create | Update a cosigner |
| DELETE | `/cosigners/[id]` | `cosigners.delete` | — | Delete a cosigner (blocked if linked to a contract) |
| GET | `/workforce-documents` | `workforce_documents.read` | exactly one of `personId` / `cosignerId` / `employmentContractId` | Latest finalized document per kind for an owner, with signed download URLs |
| POST | `/workforce-documents` | `workforce_documents.manage` | one owner id, `kind`, `contentType`, `contentLength` (≤10MB, ≤5MB photos) | Create document metadata, return a signed upload URL |
| GET | `/workforce-documents/[id]` | `workforce_documents.read` | — | Get a document + signed download URL (null if not finalized) |
| PATCH | `/workforce-documents/[id]` | `workforce_documents.manage` | — | Finalize an uploaded document (validates the stored file matches what was declared) |
| DELETE | `/workforce-documents/[id]` | `workforce_documents.manage` | — | Delete a document (storage file + metadata) |

## Devices

Attendance hardware registry and badge/identity enrollment (not to be confused with the device
*protocol* endpoints — see [Device protocol](#device-protocol-iclock) below).
Module: `packages/api/src/modules/devices/service.ts` · Validations: `devices.ts` · Internals: [modules/devices.md](./modules/devices.md)

| Method | Path | Permission | Body / query | Description |
|---|---|---|---|---|
| GET | `/devices` | `devices.read` | `branchId` | List attendance devices for a branch |
| POST | `/devices` | `devices.create` | `branchId`, `name`, `model?`, `serialNumber`, `ipAddress?`, `firmwareVersion?` | Register a device |
| GET | `/devices/[id]` | `devices.read` | — | Get one device |
| PATCH | `/devices/[id]` | `devices.update` | `branchId?`, `name?`, `model?`, `serialNumber?`, `ipAddress?`, `firmwareVersion?`, `status?` | Update a device |
| GET | `/device-identities` | `devices.read` | `employeeId` | An employee's badge/identity history |
| POST | `/device-identities` | `devices.manage_identities` | `employeeId`, `deviceIdentityNumber`, `validFrom`, `validTo?` | Enroll a badge to an employee (rejects if held by another active employee) |
| PATCH | `/device-identities/[id]` | `devices.manage_identities` | `validTo` | Close an identity's validity window (kept for history, never deleted) |

## Attendance

Module: `packages/api/src/modules/attendance/service.ts` · Validations: `attendance.ts`. See
[architecture.md](./architecture.md#attendance-derivation-pipeline) for how events, corrections,
and manual entries combine into a derived attendance day.

| Method | Path | Permission | Body / query | Description |
|---|---|---|---|---|
| GET | `/attendance/events` | `attendance.read` | `employeeId?`, `deviceId?`, `from?`, `to?`, `limit` | List raw punch events (branch-scoped unless `employeeId` given) |
| GET | `/attendance/days` | `attendance.read` | `employeeId`, `from?`, `to?`, `limit` | List derived attendance-day records |
| POST | `/attendance/days/recompute` | `attendance.recompute` | `employeeId`, `date` | Re-derive one employee-day from raw events |
| GET | `/attendance/register` | `attendance.read` | `branchId`, `date`, `departmentId?`, `search?`, `status?`, `limit`, `offset` | Daily register: present/late/absent/off-day/missing, for a branch |
| GET | `/attendance/manual-entries` | `attendance.read` | `employeeId`, `date` | List manual entries for a day |
| POST | `/attendance/manual-entries` | `attendance.record` | `employeeId`, `attendanceDate`, `kind`, `occurredAt?`, `reason` | Record a manual check-in/out or other entry |
| GET | `/attendance/push-batches` | `attendance.read` | `deviceId?`, `limit` | Device push-batch ingestion history |

## Corrections

Module: `packages/api/src/modules/corrections/service.ts` · Validations: `corrections.ts` · Internals: [modules/corrections.md](./modules/corrections.md).
Every create/update/delete here triggers a re-derivation of the affected attendance day.

| Method | Path | Permission | Body / query | Description |
|---|---|---|---|---|
| GET | `/corrections` | `corrections.read` | `employeeId` | List corrections for an employee |
| POST | `/corrections` | `corrections.create` | `employeeId`, `attendanceDate`, `type`, `disputedEventId?`, `proposedTime?`, `reason` | Create a correction |
| PATCH | `/corrections/[id]` | `corrections.update` | `values` (partial of create) | Update a correction |
| DELETE | `/corrections/[id]` | `corrections.delete` | — | Delete a correction |

## Reports & dashboard

Modules: `packages/api/src/modules/reports/service.ts`, `packages/api/src/modules/overview/service.ts` · Internals: [modules/reports.md](./modules/reports.md), [modules/overview.md](./modules/overview.md)

| Method | Path | Permission | Body / query | Description |
|---|---|---|---|---|
| GET | `/overview` | `dashboard.read` | `date`, `feed?` (max 20, default 6) | Operations dashboard: headcount, today's attendance, 7-day trend, device health, live event feed, correction/unmatched-punch counts |
| GET | `/reports/attendance-summary` | `reports.read` | `from`, `to` (≤92-day span), `branchId?`, `departmentId?`, `search?`, `sort?`, `limit`, `offset` | Per-employee attendance summary with totals and day-by-day breakdown |

## Clients & CRM

Client directory, contacts, notes, activities, catalogs (industries/client types/pipeline
stages), opportunities, projects, commercial contracts, invoices, payments, and documents.
Modules under `packages/api/src/modules/clients/*` · Validations: `clients.ts` · Internals: [modules/clients.md](./modules/clients.md).

| Method | Path | Permission | Body / query | Description |
|---|---|---|---|---|
| GET | `/clients` | `clients.read` | `search?`, `branchId?`, `industryId?`, `ownerEmployeeId?`, `status?`, `directoryStatus?`, `pipelineStageId?`, `page?`, `pageSize?` | Paginated client directory search |
| POST | `/clients` | `clients.create` | `branchId`, `ownerEmployeeId`, `legalName`, `tradingName?`, `industryId`/`industry`, `clientTypeId`/`clientType`, `phone?`, `email?`, `tin?`, `vatNumber?`, `registrationNumber?`, `businessLicenseNumber?`, `relationshipStartedOn?` | Create a client (auto-generates client code, resolves/creates catalog entries, records owner assignment + audit entry) |
| GET | `/clients/[id]` | `clients.read` | — | Get one client (with owner) |
| PATCH | `/clients/[id]` | `clients.update` | partial of create + `priority?` | Update a client, optionally reassigning owner |
| DELETE | `/clients/[id]` | `clients.archive` | — | Archive a client |
| GET | `/clients/[id]/audit` | `clients.read` | — | Client's audit trail |
| GET | `/clients/[id]/owner-assignments` | `clients.read` | — | Owner assignment history |
| GET | `/clients/[id]/profile` | `clients.read` | `asOf?` | Aggregated profile: details + primary contact + current projects + health score |
| GET | `/clients/[id]/timeline` | `clients.read` | `asOf?` | Chronological timeline (contracts, invoices, payments, activities, overdue flags) |
| GET | `/clients/overview` | `clients.read` | `branchId?`, `currency?`, `revenueMeasure?`, `asOf?`, `from?`, `to?` | Org-wide CRM/billing analytics |
| GET | `/client-contacts` | `clients.read` | `clientId`, `includeInactive?` | List contacts for a client |
| POST | `/client-contacts` | `client_contacts.create` | `clientId`, `firstName`, `lastName`, `role?`, `phone?`, `email?`, `isPrimary?` | Create a contact (requires phone or email) |
| PATCH | `/client-contacts/[id]` | `client_contacts.update` | partial of create | Update a contact |
| DELETE | `/client-contacts/[id]` | `client_contacts.archive` | — | Deactivate a contact |
| GET | `/client-notes` | `clients.read` | `clientId`, `includeArchived?` | List notes for a client |
| POST | `/client-notes` | `client_engagement.manage` | `clientId`, `authorEmployeeId`, `body`, `isPinned?` | Create a note |
| PATCH | `/client-notes/[id]` | `client_engagement.manage` | `body?`, `isPinned?` | Edit a note (blocked if archived) |
| DELETE | `/client-notes/[id]` | `client_engagement.manage` | — | Archive a note |
| GET | `/crm-activities` | `clients.read` | `clientId` | List CRM contact activities for a client |
| POST | `/crm-activities` | `client_engagement.manage` | `clientId`, `clientContactId?`, `actorEmployeeId`, `note`, `contactDate` | Log an activity |
| PATCH | `/crm-activities/[id]` | `client_engagement.manage` | `note?`, `contactDate?`, `clientContactId?` | Update an activity |
| DELETE | `/crm-activities/[id]` | `client_engagement.manage` | — | Delete an activity |
| GET | `/industries` | `clients.read` | — | List industries |
| POST | `/industries` | `client_catalogs.manage` | `name` | Create an industry |
| PATCH | `/industries/[id]` | `client_catalogs.manage` | `name?`, `status?` | Update/reactivate an industry |
| GET | `/client-types` | `clients.read` | — | List client types |
| POST | `/client-types` | `client_catalogs.manage` | `name` | Create a client type |
| PATCH | `/client-types/[id]` | `client_catalogs.manage` | `name?`, `status?` | Update/reactivate a client type |
| GET | `/pipeline-stages` | `clients.read` | — | List pipeline stages, ordered |
| POST | `/pipeline-stages` | `client_catalogs.manage` | `name`, `position`, `outcome?` | Create a pipeline stage |
| PATCH | `/pipeline-stages/[id]` | `client_catalogs.manage` | partial + `status?` | Update a pipeline stage |
| GET | `/opportunities` | `clients.read` | `branchId?`, `clientId?`, `ownerEmployeeId?`, `pipelineStageId?`, `includeClosed?` | List opportunities (open by default) |
| POST | `/opportunities` | `opportunities.create` | `branchId`, `clientId?`, `name`, `industryId?`, `ownerEmployeeId`, `pipelineStageId`, `estimatedValue?`, `currency?`, `priority?` | Create an opportunity + initial stage transition |
| GET | `/opportunities/[id]` | `clients.read` | — | Get one opportunity |
| PATCH | `/opportunities/[id]` | `opportunities.update` | partial of create | Update opportunity fields |
| POST | `/opportunities/[id]/stage` | `opportunities.move_stage` | `toPipelineStageId`, `occurredAt?`, `note?` | Move to a different pipeline stage |
| POST | `/opportunities/[id]/convert` | `opportunities.convert` | `clientId`, `toPipelineStageId?`, `occurredAt?` | Convert an opportunity into a client relationship |
| GET | `/opportunity-stage-transitions` | `clients.read` | `opportunityId` | Stage-change history for an opportunity |
| GET | `/projects` | `clients.read` | `clientId?`, `branchId?`, `status?`, `includeArchived?` | List projects |
| POST | `/projects` | `projects.create` | `clientId`, `branchId`, `commercialContractId?`, `name`, `managerEmployeeId`, `status?`, `startsOn?`, `dueOn`, `completedOn?` | Create a project |
| GET | `/projects/[id]` | `clients.read` | — | Get one project |
| PATCH | `/projects/[id]` | `projects.update` | partial of create (minus `clientId`) | Update a project (blocked if archived) |
| DELETE | `/projects/[id]` | `projects.delete` | — | Hard-delete an archived project (blocked if invoices/documents reference it) |
| POST | `/projects/[id]/archive` | `projects.archive` | — | Archive a project |
| POST | `/projects/[id]/restore` | `projects.restore` | — | Restore an archived project |
| GET | `/commercial-contracts` | `clients.read` | `clientId?`, `opportunityId?`, `status?` | List commercial contracts |
| POST | `/commercial-contracts` | `commercial_contracts.create` | `clientId`, `opportunityId?`, `serviceName`, `billingCadence?`, `startsOn`, `endsOn`, `renewalMode?`, `status?`, `signedOn?`, `amount?`, `currency?`, `paymentStructure?` | Create a contract (auto-generates contract code) |
| GET | `/commercial-contracts/[id]` | `clients.read` | — | Get one contract |
| PATCH | `/commercial-contracts/[id]` | `commercial_contracts.update` | partial of create | Update a contract |
| GET | `/invoices` | `clients.read` | `clientId?`, `branchId?`, `lifecycleStatus?`, `asOf?` | List invoices with payment summaries |
| POST | `/invoices` | `invoices.create` | `clientId`, `projectId?`, `commercialContractId?`, `branchId`, `currency`, `totalAmount`, `description?`, `note?` | Create a draft invoice (auto-generates invoice number) |
| GET | `/invoices/[id]` | `clients.read` | — | Get one invoice with payment summary |
| PATCH | `/invoices/[id]` | `invoices.update` | partial of create | Update a draft invoice (only editable while draft) |
| POST | `/invoices/[id]/issue` | `invoices.issue` | `issuedOn`, `dueOn` | Issue a draft invoice |
| POST | `/invoices/[id]/void` | `invoices.void` | — | Void an issued invoice (blocked if it has payments) |
| POST | `/invoice-payments` | `payments.record` | `invoiceId`, `amount`, `currency`, `paidOn`, `method?`, `reference?`, `recordedByEmployeeId` | Record a payment (cannot exceed outstanding balance) |
| GET | `/client-documents` | `clients.read` | `clientId`, `kind?` | List documents for a client |
| POST | `/client-documents` | `client_documents.upload` | `clientId`, at most one of `commercialContractId`/`opportunityId`/`projectId`/`invoiceId`, `kind`, `fileName`, `contentType`, `contentLength`, `accessLevel?`, `uploadedByEmployeeId` | Create document metadata, return a signed upload URL |
| GET | `/client-documents/[id]` | `clients.read` (or `client_documents.upload` if restricted) | — | Get one document + signed download URL |
| DELETE | `/client-documents/[id]` | `client_documents.delete` | — | Delete a document |
| POST | `/client-document-versions` | `client_documents.upload` | `logicalDocumentId`, `fileName`, `contentType`, `contentLength`, `accessLevel?`, `uploadedByEmployeeId` | Create a new version of an existing document, return a signed upload URL |

## Health & setup

| Method | Path | Access | Body / query | Description |
|---|---|---|---|---|
| GET | `/health` | **public** | — | Liveness check, returns `"OK"` |
| POST | `/setup` | `requireAdministrator` | `organization` (`name`, `code`), `branch` (`name`, `code`, `address`), `timezone?`, `days[7]` | First-run bootstrap: organization + first branch + working-day schedule, in one transaction |

## Device protocol (`/iclock/*`)

Not under `/api/v1` and not built with `route()` — this is the ZKTeco ADMS push protocol
that attendance devices speak, and it is **unauthenticated by design** (the protocol gives a
reader no way to present a credential). See
[architecture.md](./architecture.md#device-ingestion-iclock) for why, and for why these routes
must sit behind a network perimeter rather than being treated as a public API.

| Method | Path | Description |
|---|---|---|
| GET | `/iclock/cdata` | Handshake — replies with device config (`Realtime=1`, poll delay) |
| POST | `/iclock/cdata` | Attendance/operation upload — tab-separated body, replies bare `OK` |
| GET | `/iclock/getrequest` | Command queue poll (also the device's liveness signal) — always `OK` today |
| POST | `/iclock/devicecmd` | Command-result report — unused today, nothing issues commands yet |
