"use client";

import { useForm } from "@tanstack/react-form";
import { bootstrapOrganizationInput } from "@UnifiedAttendance/api/validations/organization";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Brand } from "@/lib/brand";
import { organizationApi } from "@/lib/api/organization";
import { BranchStep } from "./branch-step";
import { OrganizationStep } from "./organization-step";
import { ReviewStep } from "./review-step";
import { ScheduleStep } from "./schedule-step";
import { SetupShell } from "./setup-shell";
import { canContinueSetup, defaultSetupValues, SETUP_STEPS } from "./types";

export function SetupForm({ brand }: { brand: Brand }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const form = useForm({
    defaultValues: defaultSetupValues(),
    validators: {
      onSubmit: ({ value }) => {
        const result = bootstrapOrganizationInput.safeParse(value);
        return result.success ? undefined : result.error.issues[0]?.message;
      },
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        await organizationApi.bootstrap(value);
        router.replace("/dashboard");
        router.refresh();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Setup could not be completed. Try again.",
        );
      }
    },
  });

  return (
    <form.Subscribe
      selector={(state) => ({ values: state.values, isSubmitting: state.isSubmitting })}
    >
      {({ values, isSubmitting }) => {
        const updateDay = (index: number, changes: Partial<(typeof values.days)[number]>) => {
          for (const [field, value] of Object.entries(changes))
            form.setFieldValue(
              `days[${index}].${field}` as `days[${number}].isWorkingDay`,
              value as boolean,
            );
        };
        const content =
          step === 0 ? (
            <OrganizationStep
              value={values.organization}
              onChange={(field, value) => form.setFieldValue(`organization.${field}`, value)}
            />
          ) : step === 1 ? (
            <BranchStep
              value={values.branch}
              onChange={(field, value) => form.setFieldValue(`branch.${field}`, value)}
            />
          ) : step === 2 ? (
            <ScheduleStep days={values.days} onChange={updateDay} />
          ) : (
            <ReviewStep values={values} onEdit={setStep} />
          );
        return (
          <SetupShell
            brand={brand}
            step={step}
            canContinue={canContinueSetup(step, values)}
            isSubmitting={isSubmitting}
            error={error}
            onStep={setStep}
            onBack={() => setStep((current) => current - 1)}
            onContinue={() => setStep((current) => current + 1)}
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (step < SETUP_STEPS.length - 1) {
                if (canContinueSetup(step, values)) setStep((current) => current + 1);
                return;
              }
              form.handleSubmit();
            }}
          >
            {content}
          </SetupShell>
        );
      }}
    </form.Subscribe>
  );
}
