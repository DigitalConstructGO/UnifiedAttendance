export const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const SETUP_STEPS = ["Organization", "First branch", "Working week", "Review & activate"];

export type SetupValues = {
  organization: { name: string; code: string };
  branch: { name: string; code: string; address: string };
  days: Array<{
    weekday: number;
    isWorkingDay: boolean;
    openingTime: string | null;
    closingTime: string | null;
  }>;
};

export function defaultSetupValues(): SetupValues {
  return {
    organization: { name: "", code: "" },
    branch: { name: "", code: "", address: "" },
    days: WEEK.map((_, weekday) => ({
      weekday,
      isWorkingDay: weekday < 5,
      openingTime: weekday < 5 ? "08:00" : null,
      closingTime: weekday < 5 ? "17:00" : null,
    })),
  };
}

export function canContinueSetup(step: number, values: SetupValues) {
  const validCode = (code: string) => /^[A-Za-z0-9-]{2,20}$/.test(code);
  if (step === 0)
    return Boolean(values.organization.name.trim() && validCode(values.organization.code));
  if (step === 1)
    return Boolean(
      values.branch.name.trim() && validCode(values.branch.code) && values.branch.address.trim(),
    );
  if (step === 2)
    return values.days.every(
      (day) => !day.isWorkingDay || Boolean(day.openingTime && day.closingTime),
    );
  return true;
}
