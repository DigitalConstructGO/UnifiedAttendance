"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import type React from "react";

import { organizationApi, organizationKeys, organizationQueries } from "@/lib/api";
import type { WorkingDay } from "@/lib/api/organization";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";
import { emptyBranchDraft, type BranchDraft, type WorkspaceTab } from "./workspace-model";

/**
 * Server state comes from queries; the tabs edit drafts layered over it. A draft
 * of `null` means "show what the server says", so clearing it after a successful
 * save is all it takes for the form to follow the refetched record.
 *
 * The schedule draft is tagged with its branch: without that, switching branches
 * would show the previous branch's edits over the new branch's days.
 */
export function useOrganizationWorkspace() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [chosenBranch, setChosenBranch] = useState("");
  const [orgDraft, setOrgDraft] = useState<{
    name: string;
    code: string;
    timezone: string;
  } | null>(null);
  const [branchDraft, setBranchDraft] = useState<BranchDraft | null>(null);
  const [daysDraft, setDaysDraft] = useState<{ branchId: string; days: WorkingDay[] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const organizationQuery = useQuery(organizationQueries.organization());
  const branchesQuery = useQuery(organizationQueries.branches());
  const holidaysQuery = useQuery(organizationQueries.holidays());

  const organization = organizationQuery.data ?? null;
  const branches = branchesQuery.data ?? [];
  const selectedBranch = chosenBranch || branches[0]?.id || "";

  const workingDaysQuery = useQuery(organizationQueries.workingDays(selectedBranch));

  const name = orgDraft?.name ?? organization?.name ?? "";
  const code = orgDraft?.code ?? organization?.code ?? "";
  const timezone = orgDraft?.timezone ?? organization?.timezone ?? "";
  const days =
    daysDraft?.branchId === selectedBranch ? daysDraft.days : (workingDaysQuery.data ?? []);

  function patchOrganization(changes: Partial<{ name: string; code: string; timezone: string }>) {
    setOrgDraft({ name, code, timezone, ...changes });
  }

  const setDays: Dispatch<SetStateAction<WorkingDay[]>> = (update) => {
    setDaysDraft({
      branchId: selectedBranch,
      days: typeof update === "function" ? update(days) : update,
    });
  };

  const saveOrganization = useMutation({
    mutationFn: organizationApi.update,
    onSuccess: async () => {
      setOrgDraft(null);
      setNotice("Organization details saved.");
      await queryClient.invalidateQueries({ queryKey: organizationKeys.organization });
    },
  });

  const saveDays = useMutation({
    mutationFn: organizationApi.replaceWorkingDays,
    onSuccess: async () => {
      setDaysDraft(null);
      setNotice("Working week saved.");
      await queryClient.invalidateQueries({
        queryKey: organizationKeys.workingDays(selectedBranch),
      });
    },
  });

  const saveBranch = useMutation({
    mutationFn: (draft: BranchDraft) =>
      draft.id
        ? organizationApi.updateBranch({
            branchId: draft.id,
            name: draft.name,
            code: draft.code,
            address: draft.address,
            timezone: draft.timezone,
          })
        : organizationApi.createBranch(draft),
    onSuccess: async () => {
      setBranchDraft(null);
      setNotice("Branch saved.");
      await queryClient.invalidateQueries({ queryKey: organizationKeys.branches });
    },
  });

  const addHoliday = useMutation({
    mutationFn: organizationApi.createHoliday,
    onSuccess: async () => {
      setNotice("Holiday added.");
      await queryClient.invalidateQueries({ queryKey: organizationKeys.holidays() });
    },
  });

  const deleteHoliday = useMutation({
    mutationFn: organizationApi.deleteHoliday,
    onSuccess: async () => {
      setNotice("Holiday removed.");
      await queryClient.invalidateQueries({ queryKey: organizationKeys.holidays() });
    },
  });

  const writes = [
    [saveOrganization, "Could not save changes."],
    [saveDays, "Could not save schedule."],
    [saveBranch, "Could not save branch."],
    [addHoliday, "Could not add holiday."],
    [deleteHoliday, "Could not remove holiday."],
  ] as const;

  const failedWrite = writes.find(([mutation]) => mutation.error !== null);
  const loadFailure = firstQueryFailure([
    [organizationQuery, "Could not load organization settings."],
    [branchesQuery, "Could not load branches."],
    [workingDaysQuery, "Could not load this branch schedule."],
    [holidaysQuery, "Could not load holidays."],
  ]);
  const error = failedWrite
    ? presentRequestError(failedWrite[0].error, failedWrite[1])
    : (loadFailure?.error ?? null);

  /** One action, one banner: drop the previous result before starting the next write. */
  function clearFeedback() {
    setNotice(null);
    for (const [mutation] of writes) mutation.reset();
  }

  function selectTab(nextTab: WorkspaceTab) {
    setTab(nextTab);
    clearFeedback();
  }

  return {
    tab,
    organization,
    branches,
    holidays: holidaysQuery.data ?? [],
    selectedBranch,
    days,
    name,
    code,
    timezone,
    branchDraft: branchDraft ?? emptyBranchDraft(organization?.timezone),
    notice,
    error,
    busy: writes.some(([mutation]) => mutation.isPending),
    selectTab,
    setSelectedBranch: setChosenBranch,
    setDays,
    setName: (value: string) => patchOrganization({ name: value }),
    setCode: (value: string) => patchOrganization({ code: value }),
    setTimezone: (value: string) => patchOrganization({ timezone: value }),
    setBranchDraft,
    saveOrganization: () => {
      if (!organization) return;
      clearFeedback();
      saveOrganization.mutate({ id: organization.id, name, code, timezone });
    },
    saveDays: () => {
      if (!selectedBranch) return;
      clearFeedback();
      saveDays.mutate({ branchId: selectedBranch, days });
    },
    saveBranch: (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      clearFeedback();
      saveBranch.mutate(branchDraft ?? emptyBranchDraft(organization?.timezone));
    },
    addHoliday: (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const target = event.currentTarget;
      const form = new FormData(target);
      clearFeedback();
      addHoliday.mutate(
        {
          name: String(form.get("name")),
          holidayDate: String(form.get("date")),
          branchId: String(form.get("branchId")) || null,
        },
        { onSuccess: () => target.reset() },
      );
    },
    deleteHoliday: (id: string) => {
      clearFeedback();
      deleteHoliday.mutate(id);
    },
    retry: loadFailure?.retry,
  };
}
