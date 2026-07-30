import type { ReactNode } from "react";

import type { ClientContact, ClientRow, ProjectRow } from "@/lib/api";
import {
  CLIENT_PRIORITY_META,
  money,
  personName,
  PROJECT_PROGRESS_TONE,
  PROJECT_STATUS_META,
} from "@/lib/client-presentation";
import { ethiopianDate, ethiopianYear, relativeTime } from "@/lib/ethiopian-date";

import { TabPanel } from "./tab-shell";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[0.625rem] font-bold tracking-[0.07em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-strong mt-1.5 text-sm font-semibold break-words">{children}</dd>
    </div>
  );
}

function HealthRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-strong text-xs font-bold">{children}</dd>
    </div>
  );
}

export function ProjectSummaryCard({
  project,
  timeZone,
}: {
  project: ProjectRow;
  timeZone: string;
}) {
  const status = PROJECT_STATUS_META[project.project.status];
  return (
    <article className="rounded-[13px] bg-[var(--surface-subtle)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-strong text-sm font-bold">{project.project.name}</h4>
        <p className={`text-xs font-bold ${status.className}`}>
          {status.label} · {project.project.progressPercent}%
        </p>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={project.project.progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${project.project.name} progress`}
      >
        <div
          className={`h-full rounded-full ${PROJECT_PROGRESS_TONE[project.project.status]}`}
          style={{ width: `${project.project.progressPercent}%` }}
        />
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
        <div className="flex gap-1.5">
          <dt>Manager</dt>
          <dd className="text-strong font-semibold">{personName(project.manager.person)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Budget</dt>
          <dd className="text-strong font-semibold">
            {money(project.project.budgetAmount, project.project.currency)}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Due</dt>
          <dd className="text-strong font-semibold">
            {ethiopianDate(project.project.dueOn, timeZone)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function OverviewTab({
  client,
  projects,
  primaryContact,
  timeZone,
}: {
  client: ClientRow;
  projects: ProjectRow[];
  primaryContact: ClientContact | null;
  timeZone: string;
}) {
  const record = client.client;
  const priority = record.priority ? CLIENT_PRIORITY_META[record.priority] : null;
  const currentProjects = projects.filter(
    (row) => row.project.status === "in_progress" || row.project.status === "planning",
  );

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
      <div className="grid gap-5">
        <TabPanel className="p-6">
          <h2 className="text-strong font-heading text-base font-bold">Company information</h2>
          <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <Detail label="Legal company name">{record.legalName}</Detail>
            <Detail label="Trading name">{record.tradingName || "—"}</Detail>
            <Detail label="TIN">{record.tin || "—"}</Detail>
            <Detail label="VAT number">{record.vatNumber || "—"}</Detail>
            <Detail label="Registration no.">{record.registrationNumber || "—"}</Detail>
            <Detail label="Business licence">{record.businessLicenseNumber || "—"}</Detail>
            <Detail label="Website">
              {record.website ? (
                <a
                  href={record.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-info underline-offset-4 hover:underline"
                >
                  {record.website.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                "—"
              )}
            </Detail>
            <Detail label="Industry">{client.industry.name}</Detail>
            <Detail label="Company size">{client.companySize?.name ?? "—"}</Detail>
            <Detail label="Founded">
              {ethiopianYear(record.foundedYear, record.foundedCalendar)}
            </Detail>
          </dl>
        </TabPanel>

        <TabPanel className="p-6">
          <h2 className="text-strong font-heading text-base font-bold">Current projects</h2>
          {currentProjects.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {currentProjects.map((project) => (
                <ProjectSummaryCard
                  key={project.project.id}
                  project={project}
                  timeZone={timeZone}
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              No planned or in-progress projects for this client.
            </p>
          )}
        </TabPanel>
      </div>

      <div className="grid gap-5">
        <TabPanel className="p-6">
          <h2 className="text-strong font-heading text-base font-bold">Account health</h2>
          <dl className="mt-4 divide-y divide-border">
            <HealthRow label="Health score">
              {/* Health is a derived read model; until it ships the row states that plainly. */}
              <span className="text-muted-foreground">Not yet calculated</span>
            </HealthRow>
            <HealthRow label="Priority">
              {priority ? (
                <span className={`rounded-md px-2 py-1 text-[0.6875rem] ${priority.className}`}>
                  {priority.label}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </HealthRow>
            <HealthRow label="Client type">{client.clientType.name}</HealthRow>
            <HealthRow label="Last activity">
              <span className="text-muted-foreground">
                {relativeTime(record.updatedAt, timeZone)}
              </span>
            </HealthRow>
          </dl>
        </TabPanel>

        <TabPanel className="p-6">
          <h2 className="text-strong font-heading text-base font-bold">Primary contact</h2>
          {primaryContact ? (
            <div className="mt-4">
              <p className="text-strong text-sm font-bold">{personName(primaryContact)}</p>
              {primaryContact.role ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{primaryContact.role}</p>
              ) : null}
              <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                {primaryContact.phone ? <p>{primaryContact.phone}</p> : null}
                {primaryContact.email ? <p className="break-all">{primaryContact.email}</p> : null}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              No primary contact yet. Company channels: {record.phone || "no phone"} ·{" "}
              {record.email || "no email"}.
            </p>
          )}
        </TabPanel>
      </div>
    </div>
  );
}
