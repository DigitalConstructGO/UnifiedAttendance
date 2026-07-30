"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type Branch, type Cosigner, type Department, workforceApi } from "@/lib/api";

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "Could not save this record.";
}

export function DepartmentManager({ branches }: { branches: Branch[] }) {
  const [items, setItems] = useState<Department[]>([]);
  const [editing, setEditing] = useState<Department | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setItems(await workforceApi.departments());
  }

  useEffect(() => {
    void load().catch((cause) => setError(messageFor(cause)));
  }, []);

  async function save(form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      const values = {
        name: String(data.get("name")),
        branchId: String(data.get("branchId")) || null,
        status: String(data.get("status")) as "active" | "inactive",
      };
      if (editing) await workforceApi.updateDepartment({ id: editing.id, ...values });
      else await workforceApi.createDepartment(values);
      setEditing(null);
      form.reset();
      await load();
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Department) {
    if (!window.confirm(`Delete ${item.name}? Employees will keep no department assignment.`))
      return;
    setBusy(true);
    setError(null);
    try {
      await workforceApi.deleteDepartment(item.id);
      if (editing?.id === item.id) setEditing(null);
      await load();
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Departments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="grid gap-2 sm:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save(event.currentTarget);
          }}
        >
          <Input
            required
            name="name"
            placeholder="Department name"
            defaultValue={editing?.name}
            key={editing?.id ?? "new-name"}
          />
          <select
            name="branchId"
            defaultValue={editing?.branchId ?? ""}
            key={editing?.id ?? "new-branch"}
            className="h-8 rounded-none border bg-background px-2 text-sm"
          >
            <option value="">Company-wide</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={editing?.status ?? "active"}
            key={editing?.id ?? "new-status"}
            className="h-8 rounded-none border bg-background px-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <Button disabled={busy}>{editing ? "Save" : "Add"}</Button>
          {editing ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setEditing(null)}>
              Cancel edit
            </Button>
          ) : null}
        </form>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <ul className="divide-y text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-2">
              <span>
                <span className="font-medium">{item.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{item.status}</span>
              </span>
              <span className="flex gap-1">
                <Button size="xs" variant="ghost" onClick={() => setEditing(item)}>
                  Edit
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => void remove(item)}
                >
                  Delete
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function CosignerManager() {
  const [items, setItems] = useState<Cosigner[]>([]);
  const [editing, setEditing] = useState<Cosigner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setItems(await workforceApi.cosigners());
  }

  useEffect(() => {
    void load().catch((cause) => setError(messageFor(cause)));
  }, []);

  async function save(form: HTMLFormElement) {
    const data = new FormData(form);
    const values = {
      fullName: String(data.get("fullName")),
      phone: String(data.get("phone")) || null,
      workplace: String(data.get("workplace")) || null,
      nationalIdFrontUrl: null,
      nationalIdBackUrl: null,
      workplaceIdFrontUrl: null,
      workplaceIdBackUrl: null,
    };
    setBusy(true);
    setError(null);
    try {
      if (editing) await workforceApi.updateCosigner({ id: editing.id, ...values });
      else await workforceApi.createCosigner(values);
      setEditing(null);
      form.reset();
      await load();
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Cosigner) {
    if (!window.confirm(`Delete cosigner ${item.fullName}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await workforceApi.deleteCosigner(item.id);
      if (editing?.id === item.id) setEditing(null);
      await load();
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cosigners</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="grid gap-2 sm:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            void save(event.currentTarget);
          }}
        >
          <Input
            required
            name="fullName"
            placeholder="Full name"
            defaultValue={editing?.fullName}
            key={editing?.id ?? "new-name"}
          />
          <Input
            name="phone"
            placeholder="Phone"
            defaultValue={editing?.phone ?? ""}
            key={`${editing?.id ?? "new"}-phone`}
          />
          <Input
            name="workplace"
            placeholder="Workplace"
            defaultValue={editing?.workplace ?? ""}
            key={`${editing?.id ?? "new"}-workplace`}
          />
          <Button disabled={busy}>{editing ? "Save changes" : "Add cosigner"}</Button>
          {editing ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setEditing(null)}>
              Cancel edit
            </Button>
          ) : null}
        </form>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <ul className="divide-y text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-2">
              <span>
                <span className="font-medium">{item.fullName}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {item.workplace ?? "No workplace"}
                </span>
              </span>
              <span className="flex gap-1">
                <Button size="xs" variant="ghost" onClick={() => setEditing(item)}>
                  Edit
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => void remove(item)}
                >
                  Delete
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
