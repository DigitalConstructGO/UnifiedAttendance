"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bootstrapOrganizationInput } from "@UnifiedAttendance/api/validations/organization";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Brand } from "@/lib/brand";
import { organizationApi } from "@/lib/api/organization";
import { presentRequestError } from "@/lib/errors";
import { BranchStep } from "./branch-step";
import { OrganizationStep } from "./organization-step";
import { ReviewStep } from "./review-step";
import { ScheduleStep } from "./schedule-step";
import { canContinueSetup, defaultSetupValues, SETUP_STEPS } from "./setup-model";
import { SetupShell } from "./setup-shell";

export function SetupForm({ brand }: { brand: Brand }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  const bootstrap = useMutation({
    mutationFn: organizationApi.bootstrap,
    onSuccess: () => {
      // Bootstrap creates the organization, its first branch, and the working
      // week — nothing cached from before setup describes this workspace.
      queryClient.clear();
      router.replace("/dashboard");
      router.refresh();
    },
  });

  const form = useForm({
    defaultValues: defaultSetupValues(),
    validators: {
      onSubmit: ({ value }) => {
        const result = bootstrapOrganizationInput.safeParse(value);
        return result.success ? undefined : result.error.issues[0]?.message;
      },
    },
    onSubmit: async ({ value }) => {
      await bootstrap.mutateAsync(value).catch(() => undefined);
    },
  });

  const error = bootstrap.error
    ? presentRequestError(bootstrap.error, "Setup could not be completed. Try again.")
    : null;

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
              timeZone={values.timezone}
              onChange={(field, value) => form.setFieldValue(`organization.${field}`, value)}
              onTimeZoneChange={(value) => form.setFieldValue("timezone", value)}
            />
          ) : step === 1 ? (
            <BranchStep
              value={values.branch}
              onChange={(field, value) => form.setFieldValue(`branch.${field}`, value)}
            />
          ) : step === 2 ? (
            <ScheduleStep days={values.days} timeZone={values.timezone} onChange={updateDay} />
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
