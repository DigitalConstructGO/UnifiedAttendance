import { Input } from "@/components/ui/input";
import { WEEK, type SetupValues } from "./types";

type Day = SetupValues["days"][number];

export function ScheduleStep({
  days,
  onChange,
}: {
  days: SetupValues["days"];
  onChange: (index: number, values: Partial<Day>) => void;
}) {
  return (
    <section className="mt-2" aria-labelledby="schedule-heading">
      <h1
        id="schedule-heading"
        className="text-strong font-heading text-2xl font-bold tracking-[-0.025em]"
      >
        Working week
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose working days and the time window used for attendance calculations.
      </p>
      <div className="mt-7 overflow-hidden rounded-[14px] bg-card ring-1 ring-border">
        <div className="hidden grid-cols-[1fr_6rem_7rem_7rem] gap-3 bg-muted px-4 py-2 text-[0.625rem] font-bold tracking-[0.06em] text-muted-foreground uppercase sm:grid">
          <span>Day</span>
          <span>Status</span>
          <span>Opens</span>
          <span>Closes</span>
        </div>
        {days.map((day, index) => (
          <div
            key={day.weekday}
            className="grid gap-3 border-t border-border px-4 py-3 first:border-t-0 sm:grid-cols-[1fr_6rem_7rem_7rem] sm:items-center"
          >
            <label className="text-strong flex min-h-9 items-center gap-3 text-xs font-semibold">
              <input
                type="checkbox"
                checked={day.isWorkingDay}
                onChange={(event) =>
                  onChange(index, {
                    isWorkingDay: event.target.checked,
                    openingTime: event.target.checked ? day.openingTime || "08:00" : null,
                    closingTime: event.target.checked ? day.closingTime || "17:00" : null,
                  })
                }
                className="size-4 accent-primary"
              />
              {WEEK[index]}
            </label>
            <span
              className={`hidden text-[0.6875rem] font-semibold sm:block ${day.isWorkingDay ? "text-success" : "text-muted-foreground"}`}
            >
              {day.isWorkingDay ? "Working" : "Closed"}
            </span>
            <div className="grid grid-cols-2 gap-2 sm:contents">
              <Input
                aria-label={`${WEEK[index]} opening time`}
                type="time"
                disabled={!day.isWorkingDay}
                value={day.openingTime || ""}
                onChange={(event) => onChange(index, { openingTime: event.target.value || null })}
                className="h-9 rounded-[9px]"
              />
              <Input
                aria-label={`${WEEK[index]} closing time`}
                type="time"
                disabled={!day.isWorkingDay}
                value={day.closingTime || ""}
                onChange={(event) => onChange(index, { closingTime: event.target.value || null })}
                className="h-9 rounded-[9px]"
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Timezone: Africa/Addis_Ababa</p>
    </section>
  );
}
