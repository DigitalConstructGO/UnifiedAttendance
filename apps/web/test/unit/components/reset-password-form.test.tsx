import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const resetPassword = vi.fn();
const push = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: { resetPassword: (...args: unknown[]) => resetPassword(...args) },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

import { ResetPasswordForm } from "@/components/reset-password-form";

function fill(password: string, confirm = password) {
  fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: confirm } });
  fireEvent.click(screen.getByRole("button", { name: /set new password/i }));
}

describe("ResetPasswordForm", () => {
  afterEach(() => {
    cleanup();
    resetPassword.mockReset();
    push.mockReset();
  });

  it("submits the token from the link with the new password, then sends the user to sign in", async () => {
    resetPassword.mockResolvedValue({ data: { status: true }, error: null });
    render(<ResetPasswordForm token="tok-123" />);

    fill("Brand-New-Pass-456");

    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith(
        expect.objectContaining({ token: "tok-123", newPassword: "Brand-New-Pass-456" }),
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(/password has been changed/i);
  });

  it("refuses mismatched passwords without calling the server", async () => {
    render(<ResetPasswordForm token="tok-123" />);

    fill("Brand-New-Pass-456", "Different-Pass-789");

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("explains when the link is expired or already used", async () => {
    resetPassword.mockResolvedValue({ data: null, error: { message: "Invalid token" } });
    render(<ResetPasswordForm token="stale" />);

    fill("Brand-New-Pass-456");

    expect(await screen.findByRole("alert")).toHaveTextContent(/expired or already been used/i);
  });

  it("tells the user the link is incomplete when there is no token", () => {
    render(<ResetPasswordForm token={null} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/link is incomplete/i);
    expect(screen.queryByRole("button", { name: /set new password/i })).not.toBeInTheDocument();
  });
});
