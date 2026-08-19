"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type React from "react";

import { notificationKeys, notificationsApi, notificationQueries } from "@/lib/api";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";
import { emptyTierDraft, type TierDraft } from "./tier-model";
import type { NotificationCondition } from "@/lib/api/notifications";

export function useNotificationTiers() {
  const queryClient = useQueryClient();
  const [condition, setCondition] = useState<NotificationCondition>("late");
  const [draft, setDraft] = useState<TierDraft | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const tiersQuery = useQuery(notificationQueries.tiers(condition));
  const tiers = tiersQuery.data ?? [];

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: notificationKeys.tiersAll });
  }

  const saveTier = useMutation({
    mutationFn: (values: TierDraft) =>
      values.id
        ? notificationsApi.updateTier({
            id: values.id,
            condition: values.condition,
            threshold: values.threshold,
            subjectTemplate: values.subjectTemplate,
            bodyTemplate: values.bodyTemplate,
          })
        : notificationsApi.createTier({
            condition: values.condition,
            threshold: values.threshold,
            subjectTemplate: values.subjectTemplate,
            bodyTemplate: values.bodyTemplate,
          }),
    onSuccess: async () => {
      setDraft(null);
      setNotice("Tier saved.");
      await invalidate();
    },
  });

  const deleteTier = useMutation({
    mutationFn: notificationsApi.deleteTier,
    onSuccess: async () => {
      setNotice("Tier deleted.");
      await invalidate();
    },
  });

  const writes = [
    [saveTier, "Could not save this tier."],
    [deleteTier, "Could not delete this tier."],
  ] as const;

  const failedWrite = writes.find(([mutation]) => mutation.error !== null);
  const loadFailure = firstQueryFailure([[tiersQuery, "Could not load notification tiers."]]);
  const error = failedWrite
    ? presentRequestError(failedWrite[0].error, failedWrite[1])
    : (loadFailure?.error ?? null);

  function clearFeedback() {
    setNotice(null);
    for (const [mutation] of writes) mutation.reset();
  }

  function selectCondition(next: NotificationCondition) {
    setCondition(next);
    setDraft(null);
    clearFeedback();
  }

  return {
    condition,
    tiers,
    loading: tiersQuery.isLoading,
    draft: draft ?? emptyTierDraft(condition),
    editing: draft?.id !== undefined,
    notice,
    error,
    busy: writes.some(([mutation]) => mutation.isPending),
    selectCondition,
    setDraft,
    startEdit: (tier: TierDraft) => {
      clearFeedback();
      setDraft(tier);
    },
    cancelEdit: () => {
      clearFeedback();
      setDraft(null);
    },
    saveTier: (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      clearFeedback();
      saveTier.mutate(draft ?? emptyTierDraft(condition));
    },
    deleteTier: (id: string) => {
      clearFeedback();
      deleteTier.mutate(id);
    },
    retry: loadFailure?.retry,
  };
}
