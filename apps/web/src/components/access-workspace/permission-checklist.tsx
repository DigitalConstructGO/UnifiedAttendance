"use client";

import { PERMISSION_GROUPS } from "@UnifiedAttendance/api/rbac/permissions";
import { ChevronDown, Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const PERMISSION_MODULES = Object.entries(PERMISSION_GROUPS).map(([module, actions]) => ({
  module,
  codes: actions.map((action) => `${module}.${action}`),
}));

export function moduleLabel(module: string) {
  const label = module.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function actionLabel(code: string) {
  return code.split(".")[1]?.replace(/_/g, " ") ?? code;
}

/**
 * One plain-language sentence per permission code, for the hover tooltip.
 * Written for whoever is granting access, not for engineers — name what the
 * role can then do, not the code path it unlocks. Every sentence starts
 * "Lets them ..." so it reads as "whoever holds this permission can ...".
 */
const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  "organization.read": "Lets them see the organization's name, branches, and settings.",
  "organization.update": "Lets them change the organization's name, timezone, and settings.",

  "branches.read": "Lets them see the list of branches and their details.",
  "branches.create": "Lets them add a new branch.",
  "branches.update": "Lets them edit a branch's name, address, or settings.",
  "branches.manage_schedule":
    "Lets them set a branch's working days, shift hours, and grace period.",
  "branches.archive": "Lets them move a branch out of active use without deleting it.",
  "branches.restore": "Lets them bring an archived branch back into active use.",
  "branches.delete":
    "Lets them permanently remove an archived branch, once nothing is attached to it.",

  "holidays.read": "Lets them see the holidays configured for a branch.",
  "holidays.create": "Lets them add a holiday to a branch's calendar.",
  "holidays.update": "Lets them change a holiday's date or name.",
  "holidays.delete": "Lets them remove a holiday from the calendar.",

  "departments.read": "Lets them see the list of departments.",
  "departments.create": "Lets them add a new department.",
  "departments.update": "Lets them rename or edit a department.",
  "departments.delete": "Lets them remove a department.",

  "positions.read": "Lets them see the list of job positions.",
  "positions.create": "Lets them add a new job position.",
  "positions.update": "Lets them rename or edit a job position.",
  "positions.delete": "Lets them remove a job position.",

  "employees.read": "Lets them see employee profiles and their details.",
  "employees.create": "Lets them add a new employee.",
  "employees.update": "Lets them edit an employee's personal and job details.",
  "employees.archive":
    "Lets them move an employee out of the active directory without deleting them.",
  "employees.restore": "Lets them bring an archived employee back to active status.",
  "employees.delete":
    "Lets them permanently remove an archived employee, once nothing is attached to them.",

  "employment.read":
    "Lets them see an employee's employment history — branch, department, position, and status over time.",
  "employment.transition":
    "Lets them record a dated change to an employee's branch, department, position, employment type, or status.",

  "employment_contracts.read": "Lets them see an employee's signed employment contracts.",
  "employment_contracts.create": "Lets them upload a new employment contract for an employee.",
  "employment_contracts.update": "Lets them edit or update an employment contract's details.",
  "employment_contracts.delete": "Lets them remove an employment contract.",

  "cosigners.read": "Lets them see the cosigners recorded for an employee's contracts.",
  "cosigners.create": "Lets them add a cosigner to an employee's contract.",
  "cosigners.update": "Lets them edit a cosigner's details.",
  "cosigners.delete": "Lets them remove a cosigner.",

  "workforce_documents.read": "Lets them see uploaded documents like ID copies and certificates.",
  "workforce_documents.manage":
    "Lets them upload, replace, or remove an employee's documents and profile photo.",

  "devices.read": "Lets them see the list of attendance devices and their status.",
  "devices.create": "Lets them register a new attendance device.",
  "devices.update": "Lets them edit a device's name, branch, or settings.",
  "devices.manage_identities":
    "Lets them link or unlink an employee's fingerprint or badge identity on a device.",

  "attendance.read": "Lets them see attendance records, the daily register, and reports.",
  "attendance.record":
    "Lets them manually record a check-in, check-out, or mark someone present or absent.",
  "attendance.recompute":
    "Lets them force a day's attendance outcome to be recalculated from its punches.",

  "corrections.read": "Lets them see disputed or corrected attendance records.",
  "corrections.create": "Lets them submit a correction to a disputed check-in or check-out.",
  "corrections.update": "Lets them edit a pending correction.",
  "corrections.delete": "Lets them remove a correction.",

  "clients.read": "Lets them see the client directory and client profiles.",
  "clients.create": "Lets them add a new client.",
  "clients.update": "Lets them edit a client's details.",
  "clients.archive": "Lets them move a client out of the active directory without deleting them.",
  "clients.restore": "Lets them bring an archived client back to active status.",
  "clients.delete":
    "Lets them permanently remove an archived client, once nothing is attached to them.",

  "client_contacts.create": "Lets them add a contact person for a client.",
  "client_contacts.update": "Lets them edit a client contact's details.",
  "client_contacts.archive": "Lets them remove a contact from a client's active contact list.",

  "opportunities.create": "Lets them add a new sales lead.",
  "opportunities.update": "Lets them edit a lead's details.",
  "opportunities.move_stage": "Lets them move a lead to a different pipeline stage.",
  "opportunities.convert": "Lets them convert a won lead into a client.",

  "projects.create": "Lets them start a new project for a client.",
  "projects.update": "Lets them edit a project's details.",
  "projects.archive": "Lets them move a project out of the active list without deleting it.",
  "projects.restore": "Lets them bring an archived project back to active.",
  "projects.delete":
    "Lets them permanently remove an archived project, once nothing is attached to it.",

  "commercial_contracts.create": "Lets them draft a new commercial contract for a client.",
  "commercial_contracts.update": "Lets them edit a commercial contract's details or status.",
  "commercial_contracts.delete":
    "Lets them permanently remove a commercial contract, once nothing is attached to it.",

  "invoices.create": "Lets them create a new invoice for a client.",
  "invoices.update": "Lets them edit a draft invoice.",
  "invoices.issue": "Lets them issue an invoice so it becomes payable.",
  "invoices.void": "Lets them void an issued invoice.",

  "payments.record": "Lets them record a payment received against an invoice.",

  "client_documents.upload":
    "Lets them upload a document — contract, proposal, NDA, and similar — to a client.",
  "client_documents.delete":
    "Lets them permanently remove a client document, including every version of it, and its file.",

  "client_engagement.manage":
    "Lets them add and edit client notes and logged activities such as calls, meetings, and site visits.",

  "client_catalogs.manage":
    "Lets them manage the shared lists clients are picked from — industries, client types, and pipeline stages.",

  "reports.read": "Lets them see operational reports.",

  "dashboard.read": "Lets them see the overview dashboard.",

  "notifications.manage":
    "Lets them configure the late-arrival and absence email notification tiers.",
};

function actionDescription(code: string) {
  return PERMISSION_DESCRIPTIONS[code] ?? "Lets them do this.";
}

export function PermissionChecklist({
  selected,
  onToggle,
  onSetModule,
}: {
  selected: readonly string[];
  onToggle: (code: string) => void;
  onSetModule: (codes: string[], granted: boolean) => void;
}) {
  return (
    <div className="grid gap-2">
      {PERMISSION_MODULES.map(({ module, codes }) => {
        const chosen = codes.filter((code) => selected.includes(code));
        const all = chosen.length === codes.length;
        return (
          <details key={module} className="group rounded-[11px] border border-border">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <span className="text-strong flex-1">{moduleLabel(module)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  chosen.length > 0
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {chosen.length}/{codes.length}
              </span>
              <ChevronDown
                className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="border-t border-border px-4 py-3">
              <button
                type="button"
                className="mb-2 text-xs font-bold text-primary hover:underline"
                onClick={() => onSetModule(codes, !all)}
              >
                {all ? "Clear module" : "Select module"}
              </button>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {codes.map((code) => (
                  <div
                    key={code}
                    className="flex items-center gap-2 rounded-[9px] border border-border px-3 py-2 text-xs font-semibold has-checked:border-primary/40 has-checked:bg-primary/5"
                  >
                    <label className="flex min-w-0 flex-1 items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selected.includes(code)}
                        onChange={() => onToggle(code)}
                        className="size-4 accent-primary"
                      />
                      <span className="min-w-0">
                        <span className="text-strong block capitalize">{actionLabel(code)}</span>
                        <span className="block font-mono text-[0.6875rem] font-normal text-muted-foreground">
                          {code}
                        </span>
                      </span>
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={`What does ${actionLabel(code)} allow?`}
                          className="shrink-0 rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          <Info className="size-3.5" aria-hidden="true" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-56 text-left font-normal">
                        {actionDescription(code)}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
