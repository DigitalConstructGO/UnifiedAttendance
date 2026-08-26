"use client";

import { useForm } from "@tanstack/react-form";
import { KeyRound, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const request = z.object({
  email: z.email("Enter a valid email address"),
});

export function ForgotPasswordForm({ className, ...props }: React.ComponentProps<"div">) {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm({
    defaultValues: { email: "" },
    validators: { onSubmit: request },
    onSubmit: async ({ value }) => {
      // Whatever the server says, the screen says the same thing: confirming that an
      // address is unknown would tell a stranger which emails have accounts.
      await authClient.requestPasswordReset({ email: value.email, redirectTo: "/reset-password" });
      setSubmitted(true);
    },
  });

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      <Card className="gap-0 rounded-[18px] border-0 py-0 shadow-[var(--shadow-card)] ring-1 ring-border">
        <CardHeader className="gap-2 px-6 pt-7 pb-6 text-left sm:px-8 sm:pt-8">
          <div className="mb-2 grid size-10 place-items-center rounded-[11px] bg-accent text-accent-foreground">
            <KeyRound className="size-[18px]" aria-hidden="true" />
          </div>
          <CardTitle className="text-strong font-heading text-2xl font-bold tracking-[-0.025em]">
            Forgot your password?
          </CardTitle>
          <CardDescription className="text-[0.8125rem] leading-5">
            Enter the email address on your account and we&apos;ll send you a link to choose a new
            one.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-7 sm:px-8 sm:pb-8">
          {submitted ? (
            <div className="space-y-5">
              <p
                role="status"
                className="rounded-[11px] bg-success/8 px-3.5 py-3 text-xs leading-5 text-success ring-1 ring-success/20"
              >
                If an account exists for that address, a reset link is on its way. It stays valid
                for one hour.
              </p>
              <Link href="/login" className="text-xs font-bold text-primary hover:underline">
                Back to sign in
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
                <form.Field name="email">
                  {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0}>
                      <FieldLabel className="text-strong text-xs font-bold" htmlFor={field.name}>
                        Email address
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        autoComplete="email"
                        placeholder="name@company.com"
                        aria-invalid={field.state.meta.errors.length > 0}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        className="h-11 rounded-[11px] bg-card px-3.5 text-[0.8125rem] shadow-none focus-visible:ring-3"
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>

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
                            Sending…
                          </>
                        ) : (
                          "Send reset link"
                        )}
                      </Button>
                    )}
                  </form.Subscribe>
                </Field>

                <Link
                  href="/login"
                  className="text-center text-xs font-bold text-primary hover:underline"
                >
                  Back to sign in
                </Link>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
