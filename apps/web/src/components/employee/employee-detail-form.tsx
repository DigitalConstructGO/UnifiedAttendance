"use client";

import { PencilLine } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { EmployeeRow } from "@/lib/api";
import { formatDate } from "@/lib/format-date";

import { compactSelectClass, Field } from "./fields";

const fieldClass = "h-9 rounded-[9px]";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.625rem] font-bold tracking-[0.07em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-strong mt-1.5 text-sm font-semibold break-words">{children}</dd>
    </div>
  );
}

function recorded(value: string | null | undefined) {
  return value?.trim() || "Not recorded";
}

function genderLabel(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

export function EmployeeDetailForm({
  selected,
  busy,
  updating,
  onSubmit,
}: {
  selected: EmployeeRow;
  busy: boolean;
  updating: boolean;
  onSubmit: (form: HTMLFormElement) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const restoreEditFocusRef = useRef(false);

  useEffect(() => {
    if (editing) {
      firstNameRef.current?.focus();
      return;
    }
    if (restoreEditFocusRef.current) {
      restoreEditFocusRef.current = false;
      editButtonRef.current?.focus();
    }
  }, [editing]);

  function leaveEditMode() {
    restoreEditFocusRef.current = true;
    setEditing(false);
  }

  return (
    <Card className="rounded-[18px] shadow-[var(--shadow-card)] ring-border">
      <CardHeader>
        <CardTitle className="font-bold">
          {editing ? "Edit employee record" : "Employee record"}
        </CardTitle>
        <CardDescription>
          {editing
            ? "Update profile details here. Record employment assignments separately below."
            : "Identity, contact, schedule, and emergency contact information."}
        </CardDescription>
        <CardAction>
          {editing ? (
            <span
              role="status"
              className="rounded-md bg-primary/10 px-2.5 py-1 text-[0.6875rem] font-bold text-primary"
            >
              Editing
            </span>
          ) : (
            <Button
              ref={editButtonRef}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-[9px] font-bold"
              aria-label="Edit employee record"
              aria-controls="employee-record-content"
              onClick={() => setEditing(true)}
            >
              <PencilLine aria-hidden="true" />
              Edit
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {editing ? (
          <form
            id="employee-record-content"
            className="grid gap-3"
            aria-busy={updating}
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await onSubmit(event.currentTarget);
                leaveEditMode();
              } catch {
                // The profile banner announces the normalized request error.
              }
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name">
                <Input
                  ref={firstNameRef}
                  required
                  name="firstName"
                  defaultValue={selected.person.firstName}
                  className={fieldClass}
                />
              </Field>
              <Field label="Last name">
                <Input
                  required
                  name="lastName"
                  defaultValue={selected.person.lastName}
                  className={fieldClass}
                />
              </Field>
              <Field label="Middle name">
                <Input
                  name="middleName"
                  defaultValue={selected.person.middleName ?? ""}
                  placeholder="Optional"
                  className={fieldClass}
                />
              </Field>
              <Field label="Gender">
                <select
                  name="gender"
                  defaultValue={selected.person.gender ?? ""}
                  className={compactSelectClass}
                >
                  <option value="">Not recorded</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>
              <Field label="Phone number">
                <Input
                  type="tel"
                  name="phone"
                  defaultValue={selected.person.phone ?? ""}
                  placeholder="Optional"
                  className={fieldClass}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  name="email"
                  defaultValue={selected.person.email ?? ""}
                  placeholder="Optional"
                  className={fieldClass}
                />
              </Field>
              <Field label="Employee ID">
                <Input
                  required
                  name="employeeCode"
                  defaultValue={selected.employee.employeeCode}
                  className={fieldClass}
                />
              </Field>
              <Field label="Hire date">
                <Input
                  required
                  type="date"
                  name="hireDate"
                  defaultValue={selected.employee.hireDate}
                  className={fieldClass}
                />
              </Field>
            </div>

            <Field label="Attendance schedule">
              <span className="grid gap-1.5">
                <select
                  name="schedule"
                  defaultValue={selected.employee.hasFixedSchedule ? "fixed" : "flexible"}
                  className={compactSelectClass}
                >
                  <option value="fixed">Fixed working days</option>
                  <option value="flexible">Flexible — works as needed</option>
                </select>
                <span className="font-normal text-muted-foreground">
                  Flexible employees are not marked absent on days they are not scheduled.
                </span>
              </span>
            </Field>

            <fieldset className="grid min-w-0 gap-3 border-t border-border pt-3 sm:grid-cols-2">
              <legend className="text-strong col-span-full mb-1 text-xs font-bold">
                Emergency contact
              </legend>
              <Field label="Emergency contact name">
                <Input
                  name="emergencyContactName"
                  defaultValue={selected.person.emergencyContactName ?? ""}
                  placeholder="Optional"
                  className={fieldClass}
                />
              </Field>
              <Field label="Emergency contact phone">
                <Input
                  name="emergencyContactPhone"
                  type="tel"
                  defaultValue={selected.person.emergencyContactPhone ?? ""}
                  placeholder="Optional"
                  className={fieldClass}
                />
              </Field>
            </fieldset>

            <div className="mt-1 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                className="h-9 rounded-[9px] px-4 font-bold"
                onClick={leaveEditMode}
              >
                Cancel
              </Button>
              <Button
                disabled={busy}
                aria-busy={updating}
                className="h-9 rounded-[9px] px-4 font-bold"
              >
                {updating ? "Saving changes…" : "Save changes"}
              </Button>
            </div>
          </form>
        ) : (
          <div id="employee-record-content" className="grid gap-5">
            <section aria-labelledby="employee-personal-details">
              <h3 id="employee-personal-details" className="text-strong text-xs font-bold">
                Personal and employment details
              </h3>
              <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <Detail label="First name">{selected.person.firstName}</Detail>
                <Detail label="Last name">{selected.person.lastName}</Detail>
                <Detail label="Middle name">{recorded(selected.person.middleName)}</Detail>
                <Detail label="Gender">{genderLabel(selected.person.gender)}</Detail>
                <Detail label="Phone number">{recorded(selected.person.phone)}</Detail>
                <Detail label="Email">{recorded(selected.person.email)}</Detail>
                <Detail label="Employee ID">{selected.employee.employeeCode}</Detail>
                <Detail label="Hire date">{formatDate(selected.employee.hireDate)}</Detail>
                <Detail label="Attendance schedule">
                  {selected.employee.hasFixedSchedule
                    ? "Fixed working days"
                    : "Flexible — works as needed"}
                </Detail>
              </dl>
            </section>

            <section
              aria-labelledby="employee-emergency-contact"
              className="border-t border-border pt-5"
            >
              <h3 id="employee-emergency-contact" className="text-strong text-xs font-bold">
                Emergency contact
              </h3>
              <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <Detail label="Name">{recorded(selected.person.emergencyContactName)}</Detail>
                <Detail label="Phone number">
                  {recorded(selected.person.emergencyContactPhone)}
                </Detail>
              </dl>
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
