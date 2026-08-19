import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { NotificationTier } from "@/lib/api/notifications";
import type { TierDraft } from "./tier-model";

type Props = {
  tiers: NotificationTier[];
  loading: boolean;
  busy: boolean;
  onEdit: (draft: TierDraft) => void;
  onDelete: (id: string) => void;
};

export function TierList({ tiers, loading, busy, onEdit, onDelete }: Props) {
  const [deleting, setDeleting] = useState<NotificationTier | null>(null);

  return (
    <div className="divide-y divide-border rounded-[18px] bg-card px-5 shadow-[var(--shadow-card)] ring-1 ring-border">
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading tiers…</p>
      ) : tiers.length ? (
        tiers.map((tier) => (
          <div key={tier.id} className="flex items-start justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="text-strong text-sm font-semibold">
                At {tier.threshold}+ time{tier.threshold === 1 ? "" : "s"} this week
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{tier.subjectTemplate}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{tier.bodyTemplate}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit tier at threshold ${tier.threshold}`}
                disabled={busy}
                onClick={() =>
                  onEdit({
                    id: tier.id,
                    condition: tier.condition,
                    threshold: tier.threshold,
                    subjectTemplate: tier.subjectTemplate,
                    bodyTemplate: tier.bodyTemplate,
                  })
                }
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete tier at threshold ${tier.threshold}`}
                className="text-destructive hover:text-destructive"
                disabled={busy}
                onClick={() => setDeleting(tier)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No tiers configured for this condition yet — nothing will be sent until you add one.
        </p>
      )}

      {deleting ? (
        <ConfirmDialog
          title={`Delete the tier at threshold ${deleting.threshold}?`}
          description="Employees who reach this occurrence count this week will no longer get this notice. This cannot be undone."
          confirmLabel="Delete tier"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            onDelete(deleting.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </div>
  );
}
