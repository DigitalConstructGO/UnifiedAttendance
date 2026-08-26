"use client";

import { useForm } from "@tanstack/react-form";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const passwords = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "The passwords do not match",
    path: ["confirmPassword"],
  });

const inputClass =
  "h-11 rounded-[11px] bg-card px-3.5 text-[0.8125rem] shadow-none focus-visible:ring-3";

export function ResetPasswordForm({
  token,
  className,
  ...props
}: React.ComponentProps<"div"> & { token: string | null }) {
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { newPassword: "", confirmPassword: "" },
    validators: { onSubmit: passwords },
    onSubmit: async ({ value }) => {
      if (!token) return;
      setFailure(null);
      const result = await authClient.resetPassword({ token, newPassword: value.newPassword });
      if (result.error) {
        setFailure(
          "This reset link has expired or already been used. Request a new one from the sign-in page.",
        );
        return;
      }
      setDone(true);
    },
  });

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      <Card className="gap-0 rounded-[18px] border-0 py-0 shadow-[var(--shadow-card)] ring-1 ring-border">
        <CardHeader className="gap-2 px-6 pt-7 pb-6 text-left sm:px-8 sm:pt-8">
          <div className="mb-2 grid size-10 place-items-center rounded-[11px] bg-accent text-accent-foreground">
            <ShieldCheck className="size-[18px]" aria-hidden="true" />
          </div>
          <CardTitle className="text-strong font-heading text-2xl font-bold tracking-[-0.025em]">
            Choose a new password
          </CardTitle>
          <CardDescription className="text-[0.8125rem] leading-5">
            Pick something at least 8 characters long that you don&apos;t use anywhere else.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-7 sm:px-8 sm:pb-8">
          {!token ? (
            <div className="space-y-5">
              <p
                role="alert"
                className="rounded-[11px] bg-destructive/8 px-3.5 py-3 text-xs leading-5 text-destructive ring-1 ring-destructive/20"
              >
                This reset link is incomplete. Open the link from your email again, or request a new
                one.
              </p>
              <Link
                href="/forgot-password"
                className="text-xs font-bold text-primary hover:underline"
              >
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div className="space-y-5">
              <p
                role="status"
                className="rounded-[11px] bg-success/8 px-3.5 py-3 text-xs leading-5 text-success ring-1 ring-success/20"
              >
                Your password has been changed. Sign in with it to continue.
              </p>
              <Link href="/login" className="text-xs font-bold text-primary hover:underline">
                Go to sign in
              </Link>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                form.handleSubmit();
              }}
            >
              <FieldGroup className="gap-5">
                <form.Field name="newPassword">
                  {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0}>
                      <FieldLabel className="text-strong text-xs font-bold" htmlFor={field.name}>
                        New password
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="password"
                        autoComplete="new-password"
                        aria-invalid={field.state.meta.errors.length > 0}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        className={inputClass}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>

                <form.Field name="confirmPassword">
                  {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0}>
                      <FieldLabel className="text-strong text-xs font-bold" htmlFor={field.name}>
                        Confirm new password
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="password"
                        autoComplete="new-password"
                        aria-invalid={field.state.meta.errors.length > 0}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        className={inputClass}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>

                {failure ? (
                  <div
                    role="alert"
                    className="rounded-[11px] bg-destructive/8 px-3.5 py-3 text-xs leading-5 text-destructive ring-1 ring-destructive/20"
                  >
                    {failure}{" "}
                    <Link href="/forgot-password" className="font-bold underline">
                      Request a new link
                    </Link>
                  </div>
                ) : null}

                <Field className="pt-1">
                  <form.Subscribe>
                    {(state) => (
                      <Button
                        type="submit"
                        size="lg"
                        disabled={!state.canSubmit || state.isSubmitting}
                        className="h-11 w-full rounded-[11px] text-[0.8125rem] font-bold shadow-[var(--shadow-action)]"
                      >
                        {state.isSubmitting ? (
                          <>
                            <LoaderCircle className="animate-spin" aria-hidden="true" />
                            Saving…
                          </>
                        ) : (
                          "Set new password"
                        )}
                      </Button>
                    )}
                  </form.Subscribe>
                </Field>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
