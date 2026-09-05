"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type React from "react";

import { organizationApi, organizationKeys, organizationQueries } from "@/lib/api";
import { uploadToStorage } from "@/lib/api/client";
import type { WorkingDay } from "@/lib/api/organization";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";
import { emptyBranchDraft, type BranchDraft, type WorkspaceTab } from "./workspace-model";

export function useOrganizationWorkspace() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [logoProgress, setLogoProgress] = useState<number | null>(null);
  const [chosenBranch, setChosenBranch] = useState("");
  const [orgDraft, setOrgDraft] = useState<{
    name: string;
    code: string;
    timezone: string;
    tin: string;
    address: string;
  } | null>(null);
  const [branchDraft, setBranchDraft] = useState<BranchDraft | null>(null);
  const [daysDraft, setDaysDraft] = useState<{ branchId: string; days: WorkingDay[] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const organizationQuery = useQuery(organizationQueries.organization());
  const branchesQuery = useQuery(organizationQueries.branches());
  const archivedBranchesQuery = useQuery(organizationQueries.branches(true));
  const holidaysQuery = useQuery(organizationQueries.holidays());

  const organization = organizationQuery.data ?? null;
  const branches = branchesQuery.data ?? [];
  const archivedBranches = archivedBranchesQuery.data ?? [];
  const selectedBranch = chosenBranch || branches[0]?.id || "";

  const workingDaysQuery = useQuery(organizationQueries.workingDays(selectedBranch));

  const name = orgDraft?.name ?? organization?.name ?? "";
  const code = orgDraft?.code ?? organization?.code ?? "";
  const timezone = orgDraft?.timezone ?? organization?.timezone ?? "";
  const tin = orgDraft?.tin ?? organization?.tin ?? "";
  const address = orgDraft?.address ?? organization?.address ?? "";
  const days =
    daysDraft?.branchId === selectedBranch ? daysDraft.days : (workingDaysQuery.data ?? []);

  function patchOrganization(
    changes: Partial<{
      name: string;
      code: string;
      timezone: string;
      tin: string;
      address: string;
    }>,
  ) {
    setOrgDraft({ name, code, timezone, tin, address, ...changes });
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

  /**
   * The logo is shown by server-rendered chrome (sidebar, login page, tab
   * title) as well as by this page's query, so a change must refresh both.
   */
  async function logoChanged(message: string) {
    setNotice(message);
    await queryClient.invalidateQueries({ queryKey: organizationKeys.organization });
    await queryClient.invalidateQueries({ queryKey: organizationKeys.letterhead });
    router.refresh();
  }

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      if (!organization) throw new Error("No organization to update");
      setLogoProgress(0);
      const prepared = await organizationApi.logoUploadParams({
        id: organization.id,
        contentType: file.type as "image/png",
        contentLength: file.size,
      });
      const { secureUrl } = await uploadToStorage(
        prepared.uploadUrl,
        prepared.uploadFields,
        file,
        setLogoProgress,
      );
      if (!secureUrl) throw new Error("The storage service did not return the logo's address.");
      return organizationApi.update({ id: organization.id, logoUrl: secureUrl });
    },
    onSuccess: () => logoChanged("Logo updated."),
    onSettled: () => setLogoProgress(null),
  });

  const removeLogo = useMutation({
    mutationFn: async () => {
      if (!organization) throw new Error("No organization to update");
      return organizationApi.update({ id: organization.id, logoUrl: null });
    },
    onSuccess: () => logoChanged("Logo removed."),
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
            graceMinutes: draft.graceMinutes,
          })
        : organizationApi.createBranch(draft),
    onSuccess: async () => {
      setBranchDraft(null);
      setNotice("Branch saved.");
      await queryClient.invalidateQueries({ queryKey: organizationKeys.branchesAll });
    },
  });

  const archiveBranch = useMutation({
    mutationFn: organizationApi.archiveBranch,
    onSuccess: async () => {
      setNotice("Branch archived.");
      await queryClient.invalidateQueries({ queryKey: organizationKeys.branchesAll });
    },
  });

  const restoreBranch = useMutation({
    mutationFn: organizationApi.restoreBranch,
    onSuccess: async () => {
      setNotice("Branch restored.");
      await queryClient.invalidateQueries({ queryKey: organizationKeys.branchesAll });
    },
  });

  const deleteBranch = useMutation({
    mutationFn: organizationApi.deleteBranch,
    onSuccess: async () => {
      setNotice("Branch deleted for good.");
      await queryClient.invalidateQueries({ queryKey: organizationKeys.branchesAll });
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

  const updateHoliday = useMutation({
    mutationFn: organizationApi.updateHoliday,
    onSuccess: async () => {
      setNotice("Holiday updated.");
      await queryClient.invalidateQueries({ queryKey: organizationKeys.holidays() });
    },
  });

  const syncHolidays = useMutation({
    mutationFn: organizationApi.syncHolidays,
    onSuccess: async (result) => {
      setNotice(
        result.inserted || result.updated
          ? `Ethiopian holidays synced: ${result.inserted} added, ${result.updated} updated.`
          : "Ethiopian holidays are already up to date.",
      );
      await queryClient.invalidateQueries({ queryKey: organizationKeys.holidays() });
    },
  });

  const writes = [
    [saveOrganization, "Could not save changes."],
    [uploadLogo, "Could not upload the logo."],
    [removeLogo, "Could not remove the logo."],
    [saveDays, "Could not save schedule."],
    [saveBranch, "Could not save branch."],
    [archiveBranch, "Could not archive the branch."],
    [restoreBranch, "Could not restore the branch."],
    [deleteBranch, "Could not delete the branch."],
    [addHoliday, "Could not add holiday."],
    [deleteHoliday, "Could not remove holiday."],
    [updateHoliday, "Could not update holiday."],
    [syncHolidays, "Could not sync Ethiopian holidays."],
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
    archivedBranches,
    holidays: holidaysQuery.data ?? [],
    selectedBranch,
    days,
    name,
    code,
    timezone,
    tin,
    address,
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
    setTin: (value: string) => patchOrganization({ tin: value }),
    setAddress: (value: string) => patchOrganization({ address: value }),
    logoUrl: organization?.logoUrl ?? null,
    logoProgress,
    uploadLogo: (file: File) => {
      clearFeedback();
      uploadLogo.mutate(file);
    },
    removeLogo: () => {
      clearFeedback();
      removeLogo.mutate();
    },
    setBranchDraft,
    saveOrganization: () => {
      if (!organization) return;
      clearFeedback();
      saveOrganization.mutate({
        id: organization.id,
        name,
        code,
        timezone,
        tin: tin.trim() || null,
        address: address.trim() || null,
      });
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
    archiveBranch: (branchId: string) => {
      clearFeedback();
      archiveBranch.mutate(branchId);
    },
    restoreBranch: (branchId: string) => {
      clearFeedback();
      restoreBranch.mutate(branchId);
    },
    deleteBranch: (branchId: string) => {
      clearFeedback();
      deleteBranch.mutate(branchId);
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
    updateHolidayDate: (id: string, holidayDate: string) => {
      clearFeedback();
      updateHoliday.mutate({ id, holidayDate });
    },
    syncHolidays: () => {
      clearFeedback();
      syncHolidays.mutate();
    },
    retry: loadFailure?.retry,
  };
}
