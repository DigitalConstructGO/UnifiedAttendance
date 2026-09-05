import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("kenat", async (importOriginal) => ({
  ...(await importOriginal<typeof import("kenat")>()),
  getHolidaysForYear: vi.fn(),
}));

const { getHolidaysForYear } = await import("kenat");
const { ethiopianPublicHolidays } = await import("../../../src/modules/holidays/ethiopian");

const mocked = vi.mocked(getHolidaysForYear);

describe("ethiopianPublicHolidays, on thin holiday records", () => {
  beforeEach(() => {
    mocked.mockReset();
  });

  it("falls back to the holiday's key when the library supplies no name", () => {
    // `name` is optional in kenat's Holiday type — a holiday it cannot localize would
    // otherwise reach the database as an empty label.
    mocked.mockReturnValue([
      {
        key: "enkutatash",
        tags: ["public"],
        movable: false,
        ethiopian: { year: 2019, month: 1, day: 1 },
      },
    ]);

    expect(ethiopianPublicHolidays(2019)).toEqual([
      {
        key: "2019:enkutatash",
        name: "enkutatash",
        holidayDate: "2026-09-11",
        ethiopianDate: "2019-01-01",
      },
    ]);
  });

  it("derives the Gregorian date itself when the library omits one", () => {
    mocked.mockReturnValue([
      {
        key: "gena",
        tags: ["public"],
        movable: false,
        name: "Genna",
        ethiopian: { year: 2019, month: 4, day: 29 },
      },
    ]);

    expect(ethiopianPublicHolidays(2019)[0]).toMatchObject({ holidayDate: "2027-01-07" });
  });

  it("prefers the library's own Gregorian date when it gives one", () => {
    mocked.mockReturnValue([
      {
        key: "fasika",
        tags: ["public"],
        movable: true,
        name: "Ethiopian Easter",
        ethiopian: { year: 2019, month: 8, day: 24 },
        gregorian: { year: 2027, month: 5, day: 2 },
      },
    ]);

    expect(ethiopianPublicHolidays(2019)[0]).toMatchObject({ holidayDate: "2027-05-02" });
  });

  it("returns nothing for a year the library knows no public holidays for", () => {
    mocked.mockReturnValue([]);

    expect(ethiopianPublicHolidays(2019)).toEqual([]);
  });
});
