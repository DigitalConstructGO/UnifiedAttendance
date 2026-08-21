import { EmployeeDetailForm } from "@/components/employee/employee-detail-form";
import type { EmployeeRow } from "@/lib/api";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

const employee = {
  employee: {
    id: "employee-1",
    personId: "person-1",
    branchId: "branch-1",
    departmentId: null,
    positionId: null,
    employeeCode: "EMP-001",
    hasFixedSchedule: true,
    employmentType: "permanent",
    hireDate: "2025-01-15",
    status: "active",
    archivedAt: null,
    createdAt: "2025-01-15T08:00:00.000Z",
  },
  person: {
    id: "person-1",
    firstName: "Marta",
    middleName: null,
    lastName: "Mekonnen",
    phone: "+251911000000",
    email: "marta@example.com",
    gender: "female",
    profilePhotoUrl: null,
    emergencyContactName: "Abel Mekonnen",
    emergencyContactPhone: "+251922000000",
    createdAt: "2025-01-15T08:00:00.000Z",
  },
  department: null,
  position: null,
} satisfies EmployeeRow;

function renderEmployeeRecord(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(
    <EmployeeDetailForm selected={employee} busy={false} updating={false} onSubmit={onSubmit} />,
  );
  return onSubmit;
}

describe("EmployeeDetailForm", () => {
  it("starts in read mode and restores it when editing is cancelled", async () => {
    const user = userEvent.setup();
    const onSubmit = renderEmployeeRecord();

    expect(screen.getByText("Marta")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "First name" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit employee record" }));

    const firstName = screen.getByRole("textbox", { name: "First name" });
    expect(firstName).toHaveFocus();
    await user.clear(firstName);
    await user.type(firstName, "Meron");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Marta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit employee record" })).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("returns to read mode only after a successful save", async () => {
    const user = userEvent.setup();
    const onSubmit = renderEmployeeRecord();

    await user.click(screen.getByRole("button", { name: "Edit employee record" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Edit employee record" })).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });

  it("keeps the form open when saving fails", async () => {
    const user = userEvent.setup();
    renderEmployeeRecord(vi.fn().mockRejectedValue(new Error("Update failed")));

    await user.click(screen.getByRole("button", { name: "Edit employee record" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByRole("textbox", { name: "First name" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });
});
