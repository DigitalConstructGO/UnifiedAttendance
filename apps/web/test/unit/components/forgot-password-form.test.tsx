import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const requestPasswordReset = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: { requestPasswordReset: (...args: unknown[]) => requestPasswordReset(...args) },
}));

import { ForgotPasswordForm } from "@/components/forgot-password-form";

describe("ForgotPasswordForm", () => {
  afterEach(() => {
    cleanup();
    requestPasswordReset.mockReset();
  });

  it("asks better-auth to email a reset link for the address entered", async () => {
    requestPasswordReset.mockResolvedValue({ data: { status: true }, error: null });
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "hr@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() =>
      expect(requestPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({ email: "hr@example.test", redirectTo: "/reset-password" }),
      ),
    );
  });

  it("shows the same confirmation whether or not the address exists", async () => {
    requestPasswordReset.mockResolvedValue({ data: null, error: { message: "not found" } });
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "nobody@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/if an account exists/i);
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });

  it("does not submit an invalid address", async () => {
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });
});
