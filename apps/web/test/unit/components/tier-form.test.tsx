import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TierForm } from "@/components/notification-tiers/tier-form";
import { emptyTierDraft } from "@/components/notification-tiers/tier-model";

function renderForm(condition: "late" | "absent", bodyTemplate = "") {
  const onDraftChange = vi.fn();
  render(
    <TierForm
      draft={{ ...emptyTierDraft(condition), bodyTemplate }}
      editing={false}
      busy={false}
      onDraftChange={onDraftChange}
      onSubmit={(event) => event.preventDefault()}
      onCancel={() => {}}
    />,
  );
  return { onDraftChange };
}

describe("TierForm placeholders", () => {
  // No `globals: true` in the vitest config, so Testing Library cannot auto-clean.
  afterEach(cleanup);

  it("offers one insert button per placeholder the condition supports", () => {
    renderForm("late");

    expect(screen.getByRole("button", { name: "Insert Employee name" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Insert Minutes late" })).toBeInTheDocument();
  });

  it("does not offer minutes late for an absence tier", () => {
    renderForm("absent");

    expect(screen.queryByRole("button", { name: "Insert Minutes late" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Insert Employee name" })).toBeInTheDocument();
  });

  it("inserts the token into the body at the cursor when clicked", () => {
    const { onDraftChange } = renderForm("late", "Hi , welcome");
    const body = screen.getByLabelText("Email body") as HTMLTextAreaElement;
    body.setSelectionRange(3, 3);

    fireEvent.click(screen.getByRole("button", { name: "Insert Employee name" }));

    expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({ bodyTemplate: "Hi {{employeeName}}, welcome" }),
    );
  });
});
