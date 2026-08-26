"use client";

import { useForm } from "@tanstack/react-form";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const credentials = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const authErrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authError) authErrorRef.current?.focus();
  }, [authError]);

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: credentials },
    onSubmit: async ({ value }) => {
      setAuthError(null);
      await authClient.signIn.email(value, {
        onSuccess: () => {
          router.push("/dashboard");
          router.refresh();
        },
        onError: (error) => {
          setAuthError(
            error.error.message || error.error.statusText || "We couldn't sign you in. Try again.",
          );
        },
      });
    },
  });

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      <Card className="gap-0 rounded-[18px] border-0 py-0 shadow-[var(--shadow-card)] ring-1 ring-border">
        <CardHeader className="gap-2 px-6 pt-7 pb-6 text-left sm:px-8 sm:pt-8">
          <div className="mb-2 grid size-10 place-items-center rounded-[11px] bg-accent text-accent-foreground">
            <LockKeyhole className="size-[18px]" aria-hidden="true" />
          </div>
          <CardTitle className="text-strong font-heading text-2xl font-bold tracking-[-0.025em]">
            Welcome back
          </CardTitle>
          <CardDescription className="text-[0.8125rem] leading-5">
            Sign in to continue to your operations dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-7 sm:px-8 sm:pb-8">
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
                      onChange={(event) => {
                        setAuthError(null);
                        field.handleChange(event.target.value);
                      }}
                      className="h-11 rounded-[11px] bg-card px-3.5 text-[0.8125rem] shadow-none focus-visible:ring-3"
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>

              <form.Field name="password">
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <div className="flex items-center justify-between">
                      <FieldLabel className="text-strong text-xs font-bold" htmlFor={field.name}>
                        Password
                      </FieldLabel>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id={field.name}
                        name={field.name}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        aria-invalid={field.state.meta.errors.length > 0}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => {
                          setAuthError(null);
                          field.handleChange(event.target.value);
                        }}
                        className="h-11 rounded-[11px] bg-card px-3.5 pr-11 text-[0.8125rem] shadow-none focus-visible:ring-3"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="hover:text-strong absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-[11px] text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px]"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? (
                          <EyeOff className="size-[18px]" aria-hidden="true" />
                        ) : (
                          <Eye className="size-[18px]" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>

              {authError ? (
                <div
                  ref={authErrorRef}
                  role="alert"
                  tabIndex={-1}
                  className="rounded-[11px] bg-destructive/8 px-3.5 py-3 text-xs leading-5 text-destructive ring-1 ring-destructive/20"
                >
                  {authError}
                </div>
              ) : null}

              <Field className="pt-1">
                <form.Subscribe>
                  {(state) => (
                    <Button
                      type="submit"
                      size="lg"
                      disabled={!state.canSubmit || state.isSubmitting}
                      className="h-11 w-full rounded-[11px] text-[0.8125rem] font-bold shadow-[var(--shadow-action)] transition-[background-color,box-shadow,transform] hover:bg-primary/90 hover:shadow-[0_8px_22px_rgb(105_190_40_/_38%)]"
                    >
                      {state.isSubmitting ? (
                        <>
                          <LoaderCircle className="animate-spin" aria-hidden="true" />
                          Checking your access…
                        </>
                      ) : (
                        "Sign in to dashboard"
                      )}
                    </Button>
                  )}
                </form.Subscribe>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
