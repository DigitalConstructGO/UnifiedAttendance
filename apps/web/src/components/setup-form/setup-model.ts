import { detectedTimeZone, isValidTimeZone, WEEKDAY_NAMES } from "@/lib/timezone";

export const WEEK = WEEKDAY_NAMES;
export const SETUP_STEPS = ["Organization", "First branch", "Working week", "Review & activate"];
export const DEFAULT_WORKING_WEEKDAYS = [0, 1, 2, 3, 4] as const;
export const DEFAULT_OPENING_TIME = "08:00";
export const DEFAULT_CLOSING_TIME = "17:00";

export type SetupValues = {
  organization: { name: string; code: string };
  branch: { name: string; code: string; address: string };
  timezone: string;
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
    timezone: detectedTimeZone(),
    days: WEEK.map((_, weekday) => {
      const isWorkingDay = (DEFAULT_WORKING_WEEKDAYS as readonly number[]).includes(weekday);
      return {
        weekday,
        isWorkingDay,
        openingTime: isWorkingDay ? DEFAULT_OPENING_TIME : null,
        closingTime: isWorkingDay ? DEFAULT_CLOSING_TIME : null,
      };
    }),
  };
}

export function canContinueSetup(step: number, values: SetupValues) {
  const validCode = (code: string) => /^[A-Za-z0-9-]{2,20}$/.test(code);
  if (step === 0)
    return Boolean(
      values.organization.name.trim() &&
      validCode(values.organization.code) &&
      isValidTimeZone(values.timezone),
    );
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
