"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Device, devicesApi, devicesQueries, organizationQueries } from "@/lib/api";
import { presentRequestError } from "@/lib/errors";
import { detectedTimeZone } from "@/lib/timezone";

import { DeviceForm, type DeviceDraft } from "./device-form";
import { Enrolments } from "./enrolments";
import { DEVICE_SECTIONS, type DeviceSection, sectionMeta } from "./navigation";
import { ReaderList } from "./reader-list";

export type { DeviceSection } from "./navigation";

export function DevicesWorkspace({ section }: { section: DeviceSection }) {
  const { can } = useAccess();
  const queryClient = useQueryClient();
  const [chosenBranchId, setChosenBranchId] = useState("");
  const [editing, setEditing] = useState<Device | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const manageable = can("devices.create");
  const meta = sectionMeta(section);

  const branchesQuery = useQuery(organizationQueries.branches());
  const branches = branchesQuery.data ?? [];
  const branchId = chosenBranchId || branches[0]?.id || "";
  const timeZone =
    branches.find((branch) => branch.id === branchId)?.timezone ?? detectedTimeZone();

  const devicesQuery = useQuery(devicesQueries.list(branchId));
  const devices = devicesQuery.data ?? [];


  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["devices"] });
  }

  const saveDevice = useMutation({
    mutationFn: (draft: DeviceDraft & { id?: string }) =>
      draft.id ? devicesApi.update({ ...draft, id: draft.id }) : devicesApi.create(draft),
    onSuccess: async (device) => {
      setNotice(editing ? `${device.name} updated.` : `${device.name} registered.`);
      setEditing(null);
      await refresh();
    },
  });

  const error = saveDevice.error
    ? presentRequestError(saveDevice.error, "Could not save the reader.")
    : branchesQuery.isError
      ? presentRequestError(branchesQuery.error, "Could not load branches.")
      : devicesQuery.isError
        ? presentRequestError(devicesQuery.error, "Could not load readers.")
        : null;

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <span>Devices</span>
            <ChevronRight className="size-3" aria-hidden="true" />
            <span>{meta.label}</span>
          </p>
          <h1 className="text-strong mt-1 font-heading text-2xl font-bold tracking-[-0.03em]">
            {meta.heading}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{meta.description}</p>
        </div>

        <label className="text-strong grid min-w-48 gap-1.5 text-xs font-bold">
          Branch
          <Select
            value={branchId}
            onValueChange={(next) => {
              setChosenBranchId(String(next));
              setEditing(null);
              setNotice(null);
            }}
            items={branches.map((branch) => ({ label: branch.name, value: branch.id }))}
          >
            <SelectTrigger aria-label="Branch">
              <SelectValue className="text-strong font-semibold" placeholder="Loading…" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </header>

      <nav
        className="flex gap-1 overflow-x-auto border-b border-border"
        aria-label="Device sections"
      >
        {DEVICE_SECTIONS.map((item) => {
          const Icon = item.icon;
          const active = item.id === section;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring ${
                active
                  ? "text-strong border-primary"
                  : "hover:text-strong border-transparent text-muted-foreground"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {error ? <RequestErrorAlert error={error} focusOnError /> : null}
      {notice ? (
        <p
          role="status"
          className="rounded-[11px] bg-success/8 px-4 py-3 text-xs font-semibold text-success"
        >
          {notice}
        </p>
      ) : null}

      {section === "readers" ? (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <ReaderList
            devices={devices}
            manageable={manageable}
            loading={branchesQuery.isPending || (branchId !== "" && devicesQuery.isPending)}
            editingId={editing?.id ?? null}
            onEdit={(device) => {
              setNotice(null);
              setEditing(device);
            }}
          />

          {manageable ? (
            <section className="rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border lg:sticky lg:top-[86px]">
              <h2 className="text-strong font-heading text-base font-bold">
                {editing ? "Edit reader" : "Register a reader"}
              </h2>
              <p className="mt-1 mb-4 text-xs text-muted-foreground">
                {editing ? editing.name : "Tell the system which device to expect punches from."}
              </p>
              <DeviceForm
                branches={branches}
                branchId={branchId}
                editing={editing}
                busy={saveDevice.isPending}
                onCancelEdit={() => setEditing(null)}
                onSubmit={(draft) => {
                  setNotice(null);
                  saveDevice.mutate({ ...draft, id: editing?.id });
                }}
              />
            </section>
          ) : null}
        </div>
      ) : (
        <Enrolments branchId={branchId} timeZone={timeZone} />
      )}
    </div>
  );
}
