import { useEffect, useState } from "react";
import type React from "react";

import {
  organizationApi,
  type Branch,
  type Holiday,
  type Organization,
  type WorkingDay,
} from "@/lib/api/organization";
import { EMPTY_BRANCH_DRAFT, type BranchDraft, type WorkspaceTab } from "./types";

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

export function useOrganizationWorkspace() {
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [days, setDays] = useState<WorkingDay[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [branchDraft, setBranchDraft] = useState<BranchDraft>(EMPTY_BRANCH_DRAFT);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadWorkspace() {
    const [currentOrganization, currentBranches, currentHolidays] = await Promise.all([
      organizationApi.get(),
      organizationApi.branches(),
      organizationApi.holidays(),
    ]);
    setOrganization(currentOrganization);
    setBranches(currentBranches);
    setHolidays(currentHolidays);
    setSelectedBranch((current) => current || currentBranches[0]?.id || "");
    setName(currentOrganization?.name || "");
    setCode(currentOrganization?.code || "");
  }

  useEffect(() => {
    void loadWorkspace().catch((cause) =>
      setError(errorMessage(cause, "Could not load organization settings.")),
    );
  }, []);

  useEffect(() => {
    if (!selectedBranch) return;
    void organizationApi
      .workingDays(selectedBranch)
      .then(setDays)
      .catch(() => setError("Could not load this branch schedule."));
  }, [selectedBranch]);

  function selectTab(nextTab: WorkspaceTab) {
    setTab(nextTab);
    setNotice(null);
    setError(null);
  }

  async function runMutation(action: () => Promise<void>, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(errorMessage(cause, fallback));
    } finally {
      setBusy(false);
    }
  }

  function saveOrganization() {
    if (!organization) return;
    return runMutation(async () => {
      await organizationApi.update({ id: organization.id, name, code });
      setNotice("Organization details saved.");
      await loadWorkspace();
    }, "Could not save changes.");
  }

  function saveDays() {
    if (!selectedBranch) return;
    return runMutation(async () => {
      await organizationApi.replaceWorkingDays({ branchId: selectedBranch, days });
      setNotice("Working week saved.");
    }, "Could not save schedule.");
  }

  function saveBranch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return runMutation(async () => {
      if (branchDraft.id) {
        await organizationApi.updateBranch({
          branchId: branchDraft.id,
          name: branchDraft.name,
          code: branchDraft.code,
          address: branchDraft.address,
        });
      } else {
        await organizationApi.createBranch(branchDraft);
      }
      setNotice("Branch saved.");
      setBranchDraft(EMPTY_BRANCH_DRAFT);
      await loadWorkspace();
    }, "Could not save branch.");
  }

  function addHoliday(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    return runMutation(async () => {
      await organizationApi.createHoliday({
        name: String(form.get("name")),
        holidayDate: String(form.get("date")),
        branchId: String(form.get("branchId")) || null,
      });
      setNotice("Holiday added.");
      target.reset();
      setHolidays(await organizationApi.holidays());
    }, "Could not add holiday.");
  }

  function deleteHoliday(id: string) {
    return runMutation(async () => {
      await organizationApi.deleteHoliday(id);
      setHolidays(await organizationApi.holidays());
      setNotice("Holiday removed.");
    }, "Could not remove holiday.");
  }

  return {
    tab,
    organization,
    branches,
    holidays,
    selectedBranch,
    days,
    name,
    code,
    branchDraft,
    notice,
    error,
    busy,
    selectTab,
    setSelectedBranch,
    setDays,
    setName,
    setCode,
    setBranchDraft,
    saveOrganization,
    saveDays,
    saveBranch,
    addHoliday,
    deleteHoliday,
  };
}
