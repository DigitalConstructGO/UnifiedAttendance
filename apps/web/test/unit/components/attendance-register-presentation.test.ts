import { describe, expect, it } from "vitest";

import { localDateTimeToIso } from "@/components/attendance/register-presentation";

describe("localDateTimeToIso", () => {
  it("uses the selected branch timezone instead of a fixed offset", () => {
    expect(localDateTimeToIso("2026-07-30", "09:30", "Africa/Addis_Ababa")).toBe(
      "2026-07-30T06:30:00.000Z",
    );
  });

  it("honors daylight-saving changes in IANA timezones", () => {
    expect(localDateTimeToIso("2026-01-15", "09:30", "America/New_York")).toBe(
      "2026-01-15T14:30:00.000Z",
    );
    expect(localDateTimeToIso("2026-07-15", "09:30", "America/New_York")).toBe(
      "2026-07-15T13:30:00.000Z",
    );
  });
});
