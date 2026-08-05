"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Branch, Device } from "@/lib/api";

export type DeviceDraft = {
  branchId: string;
  name: string;
  serialNumber: string;
  model: string | null;
  ipAddress: string | null;
  firmwareVersion: string | null;
  status: "active" | "inactive";
};

const EMPTY: DeviceDraft = {
  branchId: "",
  name: "",
  serialNumber: "",
  model: null,
  ipAddress: null,
  firmwareVersion: null,
  status: "active",
};

const inputClass = "h-10 rounded-[11px] bg-background text-xs";

function trimmed(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}


export function DeviceForm({
  branches,
  branchId,
  editing,
  busy,
  onSubmit,
  onCancelEdit,
}: {
  branches: Branch[];
  branchId: string;
  editing: Device | null;
  busy: boolean;
  onSubmit: (draft: DeviceDraft) => void;
  onCancelEdit: () => void;
}) {
  const [status, setStatus] = useState<DeviceDraft["status"]>("active");
  const [formBranchId, setFormBranchId] = useState(branchId);

  // The two selects are controlled, so they have to follow the row being
  // edited — and fall back to the branch in view when adding a new reader.
  useEffect(() => {
    setStatus(editing?.status ?? "active");
    setFormBranchId(editing?.branchId ?? branchId);
  }, [editing, branchId]);

  return (
    <form
      key={editing?.id ?? "new"}
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSubmit({
          ...EMPTY,
          branchId: formBranchId,
          status,
          name: String(data.get("name")).trim(),
          serialNumber: String(data.get("serialNumber")).trim(),
          model: trimmed(data.get("model")),
          ipAddress: trimmed(data.get("ipAddress")),
          firmwareVersion: trimmed(data.get("firmwareVersion")),
        });
      }}
    >
      <Field label="Reader name">
        <Input
          required
          name="name"
          defaultValue={editing?.name ?? ""}
          placeholder="Main gate"
          className={inputClass}
        />
      </Field>

      <Field label="Serial number">
        <Input
          required
          name="serialNumber"
          defaultValue={editing?.serialNumber ?? ""}
          placeholder="As printed on the device"
          className={`${inputClass} font-heading tabular-nums`}
        />
      </Field>

      <Field label="Branch">
        <Select
          value={formBranchId}
          onValueChange={(next) => setFormBranchId(String(next))}
          items={branches.map((branch) => ({ label: branch.name, value: branch.id }))}
        >
          <SelectTrigger aria-label="Branch">
            <SelectValue className="text-strong font-semibold" placeholder="Choose a branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Model">
          <Input
            name="model"
            defaultValue={editing?.model ?? ""}
            placeholder="Optional"
            className={inputClass}
          />
        </Field>
        <Field label="Firmware">
          <Input
            name="firmwareVersion"
            defaultValue={editing?.firmwareVersion ?? ""}
            placeholder="Optional"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="IP address">
        <Input
          name="ipAddress"
          defaultValue={editing?.ipAddress ?? ""}
          placeholder="Optional"
          className={`${inputClass} font-heading tabular-nums`}
        />
        {/* Worth saying once: nothing here dials the device. */}
        <p className="text-xs text-muted-foreground">
          Recorded for your reference only. The reader always calls us, never the other way round.
        </p>
      </Field>

      {editing ? (
        <Field label="Status">
          <Select
            value={status}
            onValueChange={(next) => setStatus(next as DeviceDraft["status"])}
            items={[
              { label: "Active", value: "active" },
              { label: "Retired", value: "inactive" },
            ]}
          >
            <SelectTrigger aria-label="Status">
              <SelectValue className="text-strong font-semibold" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Retired</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        {editing ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="hover:text-strong text-xs font-bold text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Cancel
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">Readers keep every punch they have sent.</p>
        )}
        <Button disabled={busy || !formBranchId} className="h-10 rounded-[11px] px-5 font-bold">
          {busy ? "Saving…" : editing ? "Save reader" : "Register reader"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-strong grid gap-2 text-xs font-bold">
      {label}
      {children}
    </label>
  );
}
