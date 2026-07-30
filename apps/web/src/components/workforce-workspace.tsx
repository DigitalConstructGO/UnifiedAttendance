"use client";

import { useEffect, useState } from "react";

import {
  organizationApi,
  type Branch,
  workforceApi,
  type Department,
  type EmployeeRow,
  type EmploymentPeriod,
  type Position,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/components/access-provider";
import { CosignerManager } from "@/components/workforce-catalogs";

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function WorkforceWorkspace() {
  const { can } = useAccess();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [branchId, setBranchId] = useState("");
  const [selected, setSelected] = useState<EmployeeRow | null>(null);
  const [periods, setPeriods] = useState<EmploymentPeriod[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadDirectory(nextBranchId = branchId) {
    const [nextBranches, nextDepartments, nextPositions] = await Promise.all([
      organizationApi.branches(),
      workforceApi.departments(),
      workforceApi.positions(),
    ]);
    setBranches(nextBranches);
    setDepartments(nextDepartments);
    setPositions(nextPositions);
    const resolvedBranch = nextBranchId || nextBranches[0]?.id || "";
    setBranchId(resolvedBranch);
    setEmployees(resolvedBranch ? await workforceApi.employees(resolvedBranch) : []);
  }

  useEffect(() => {
    void loadDirectory().catch((cause) => setError(messageFor(cause)));
  }, []);

  async function selectEmployee(employee: EmployeeRow) {
    setSelected(employee);
    setError(null);
    try {
      setPeriods(await workforceApi.employmentPeriods(employee.employee.id));
    } catch (cause) {
      setError(messageFor(cause));
    }
  }

  async function createEmployee(form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      await workforceApi.createEmployee({
        person: {
          firstName: String(data.get("firstName")),
          lastName: String(data.get("lastName")),
          phone: String(data.get("phone")) || null,
          email: String(data.get("email")) || null,
          middleName: null,
          profilePhotoUrl: null,
          nationalIdFrontUrl: null,
          nationalIdBackUrl: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
        },
        employee: {
          branchId,
          departmentId: String(data.get("departmentId")) || null,
          positionId: String(data.get("positionId")) || null,
          employeeCode: String(data.get("employeeCode")),
          employmentType: String(data.get("employmentType")) as
            "permanent" | "contract" | "part_time" | "intern",
          hireDate: String(data.get("hireDate")),
        },
      });
      form.reset();
      setNotice("Employee created with an initial employment period.");
      await loadDirectory();
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  async function transitionEmployee(form: HTMLFormElement) {
    if (!selected) return;
    const data = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      await workforceApi.transitionEmployment({
        employeeId: selected.employee.id,
        branchId: String(data.get("branchId")),
        departmentId: String(data.get("departmentId")) || null,
        positionId: String(data.get("positionId")) || null,
        employmentType: String(data.get("employmentType")) as
          "permanent" | "contract" | "part_time" | "intern",
        status: String(data.get("status")) as "active" | "suspended" | "terminated",
        effectiveFrom: String(data.get("effectiveFrom")),
      });
      setPeriods(await workforceApi.employmentPeriods(selected.employee.id));
      setNotice("Employment transition saved.");
      await loadDirectory();
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  async function updateEmployee(form: HTMLFormElement) {
    if (!selected) return;
    const data = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      await workforceApi.updateEmployee({
        id: selected.employee.id,
        person: {
          firstName: String(data.get("firstName")),
          lastName: String(data.get("lastName")),
          phone: String(data.get("phone")) || null,
          email: String(data.get("email")) || null,
        },
        employee: {
          employeeCode: String(data.get("employeeCode")),
          hireDate: String(data.get("hireDate")),
        },
      });
      setNotice("Employee details updated.");
      await loadDirectory();
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  async function deleteEmployee() {
    if (
      !selected ||
      !window.confirm(`Delete ${selected.person.firstName} ${selected.person.lastName}?`)
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await workforceApi.deleteEmployee(selected.employee.id);
      setSelected(null);
      setPeriods([]);
      setNotice("Employee deleted.");
      await loadDirectory();
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  const manageable = can("workforce:manage");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Workforce administration</p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight">
            Employees and employment
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Current assignments and dated employment history.
          </p>
        </div>
        <label className="grid gap-1 text-xs font-medium">
          Branch
          <select
            className="h-8 rounded-none border bg-background px-2 text-sm"
            value={branchId}
            onChange={(event) =>
              void loadDirectory(event.target.value).catch((cause) => setError(messageFor(cause)))
            }
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      {notice ? (
        <p role="status" className="text-sm text-green-700">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {manageable ? (
        <Card>
          <CardHeader>
            <CardTitle>Add employee</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 md:grid-cols-3"
              onSubmit={(event) => {
                event.preventDefault();
                void createEmployee(event.currentTarget);
              }}
            >
              <Input required name="firstName" placeholder="First name" />
              <Input required name="lastName" placeholder="Last name" />
              <Input required name="employeeCode" placeholder="Employee code" />
              <Input name="phone" placeholder="Phone (optional)" />
              <Input type="email" name="email" placeholder="Email (optional)" />
              <Input required type="date" name="hireDate" />
              <select
                name="departmentId"
                className="h-8 rounded-none border bg-background px-2 text-sm"
              >
                <option value="">No department</option>
                {departments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                name="positionId"
                className="h-8 rounded-none border bg-background px-2 text-sm"
              >
                <option value="">No position</option>
                {positions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              <select
                name="employmentType"
                defaultValue="permanent"
                className="h-8 rounded-none border bg-background px-2 text-sm"
              >
                <option value="permanent">Permanent</option>
                <option value="contract">Contract</option>
                <option value="part_time">Part time</option>
                <option value="intern">Intern</option>
              </select>
              <Button disabled={busy || !branchId} className="md:col-span-3">
                Create employee
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Employee directory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2">Employee</th>
                    <th className="pb-2">Code</th>
                    <th className="pb-2">Assignment</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {employees.map((row) => (
                    <tr key={row.employee.id} className="border-t">
                      <td className="py-2 font-medium">
                        {row.person.firstName} {row.person.lastName}
                      </td>
                      <td className="py-2">{row.employee.employeeCode}</td>
                      <td className="py-2">
                        {row.department?.name ?? "—"} · {row.position?.title ?? "—"}
                      </td>
                      <td className="py-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => void selectEmployee(row)}>
                          History
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {employees.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No employees in this branch yet.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selected
                ? `${selected.person.firstName} ${selected.person.lastName}`
                : "Employment history"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected ? (
              <>
                <ol className="space-y-2 text-sm">
                  {periods.map((period) => (
                    <li key={period.id} className="border-l-2 border-primary pl-3">
                      <span className="font-medium">{period.status}</span>
                      <br />
                      <span className="text-muted-foreground">
                        {period.effectiveFrom} — {period.effectiveTo ?? "current"}
                      </span>
                    </li>
                  ))}
                </ol>
                {manageable ? (
                  <>
                    <form
                      className="grid gap-2 border-t pt-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void updateEmployee(event.currentTarget);
                      }}
                    >
                      <p className="text-sm font-medium">Employee details</p>
                      <Input
                        required
                        name="firstName"
                        defaultValue={selected.person.firstName}
                        placeholder="First name"
                      />
                      <Input
                        required
                        name="lastName"
                        defaultValue={selected.person.lastName}
                        placeholder="Last name"
                      />
                      <Input
                        name="phone"
                        defaultValue={selected.person.phone ?? ""}
                        placeholder="Phone"
                      />
                      <Input
                        type="email"
                        name="email"
                        defaultValue={selected.person.email ?? ""}
                        placeholder="Email"
                      />
                      <Input
                        required
                        name="employeeCode"
                        defaultValue={selected.employee.employeeCode}
                        placeholder="Employee code"
                      />
                      <Input
                        required
                        type="date"
                        name="hireDate"
                        defaultValue={selected.employee.hireDate}
                      />
                      <Button disabled={busy}>Save details</Button>
                    </form>
                    <form
                      className="grid gap-2 border-t pt-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void transitionEmployee(event.currentTarget);
                      }}
                    >
                      <Input required type="date" name="effectiveFrom" />
                      <select
                        name="branchId"
                        defaultValue={selected.employee.branchId}
                        className="h-8 rounded-none border bg-background px-2 text-sm"
                      >
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                      <select
                        name="departmentId"
                        className="h-8 rounded-none border bg-background px-2 text-sm"
                      >
                        <option value="">No department</option>
                        {departments.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <select
                        name="positionId"
                        className="h-8 rounded-none border bg-background px-2 text-sm"
                      >
                        <option value="">No position</option>
                        {positions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title}
                          </option>
                        ))}
                      </select>
                      <select
                        name="employmentType"
                        defaultValue={selected.employee.employmentType}
                        className="h-8 rounded-none border bg-background px-2 text-sm"
                      >
                        <option value="permanent">Permanent</option>
                        <option value="contract">Contract</option>
                        <option value="part_time">Part time</option>
                        <option value="intern">Intern</option>
                      </select>
                      <select
                        name="status"
                        defaultValue="active"
                        className="h-8 rounded-none border bg-background px-2 text-sm"
                      >
                        <option value="active">Active / transfer</option>
                        <option value="suspended">Suspend</option>
                        <option value="terminated">Terminate</option>
                      </select>
                      <Button disabled={busy}>Save dated transition</Button>
                    </form>
                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() => void deleteEmployee()}
                    >
                      Delete employee
                    </Button>
                  </>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Choose an employee to inspect their dated assignment history.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      {manageable ? <CosignerManager /> : null}
    </div>
  );
}
