"use client";

import { Check } from "lucide-react";

import { RequestErrorAlert } from "@/components/request-error-alert";
import { CONDITIONS } from "./tier-model";
import { TierForm } from "./tier-form";
import { TierList } from "./tier-list";
import { useNotificationTiers } from "./use-notification-tiers";

export function NotificationTiersWorkspace() {
  const workspace = useNotificationTiers();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold text-muted-foreground">Workspace administration</p>
        <h1 className="text-strong mt-1 font-heading text-2xl font-bold tracking-[-0.03em]">
          Notification tiers
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure the escalation emails sent when someone is late or absent. Each tier fires
          once an employee reaches its occurrence count for the week; the highest tier that still
          applies wins.
        </p>
      </header>

      <div
        className="flex gap-1 overflow-x-auto border-b border-border"
        role="tablist"
        aria-label="Notification condition"
      >
        {CONDITIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={workspace.condition === item.id}
            onClick={() => workspace.selectCondition(item.id)}
            className={`min-h-11 shrink-0 border-b-2 px-4 text-xs font-bold transition-colors ${
              workspace.condition === item.id
                ? "text-strong border-primary"
                : "hover:text-strong border-transparent text-muted-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {workspace.notice ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-[11px] bg-success/8 px-4 py-3 text-sm text-success ring-1 ring-success/20"
        >
          <Check className="size-4" />
          {workspace.notice}
        </div>
      ) : null}
      {workspace.error ? (
        <RequestErrorAlert error={workspace.error} onRetry={workspace.retry} />
      ) : null}

      <TierForm
        draft={workspace.draft}
        editing={workspace.editing}
        busy={workspace.busy}
        onDraftChange={workspace.setDraft}
        onSubmit={workspace.saveTier}
        onCancel={workspace.cancelEdit}
      />

      <TierList
        tiers={workspace.tiers}
        loading={workspace.loading}
        busy={workspace.busy}
        onEdit={workspace.startEdit}
        onDelete={workspace.deleteTier}
      />
    </div>
  );
}
