"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const triggerClass =
  "flex h-10 w-full items-center gap-2 rounded-[11px] border border-input bg-background px-3 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 data-popup-open:border-ring";

const pad = (value: number) => String(value).padStart(2, "0");
const range = (count: number) => Array.from({ length: count }, (_, index) => pad(index));

/**
 * A correction states an exact moment, and "exact" here goes down to the second
 * because that is the resolution the biometric devices record in. A punch the
 * device logged at 08:05:37 cannot be matched by a picker that only offers
 * 08:05, so hours, minutes, and seconds are each their own list.
 */
export function DateField({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T12:00:00`) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label={ariaLabel} className={triggerClass}>
        <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span
          className={
            value ? "text-strong font-heading font-semibold tabular-nums" : "text-muted-foreground"
          }
        >
          {selected
            ? new Intl.DateTimeFormat("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(selected)
            : "Pick a date"}
        </span>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          mode="single"
          autoFocus
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return;
            // Format from the local parts, never toISOString: the latter shifts
            // to UTC and can hand back yesterday for anyone east of Greenwich.
            onChange(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function TimeField({
  value,
  onChange,
  disabled = false,
}: {
  /** `HH:mm:ss`. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [hour = "00", minute = "00", second = "00"] = value.split(":");

  function set(index: 0 | 1 | 2, next: string) {
    const parts = [hour, minute, second];
    parts[index] = next;
    onChange(parts.join(":"));
  }

  return (
    <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Time">
      <Unit
        label="Hour"
        value={hour}
        options={range(24)}
        disabled={disabled}
        onChange={(next) => set(0, next)}
      />
      <Unit
        label="Minute"
        value={minute}
        options={range(60)}
        disabled={disabled}
        onChange={(next) => set(1, next)}
      />
      <Unit
        label="Second"
        value={second}
        options={range(60)}
        disabled={disabled}
        onChange={(next) => set(2, next)}
      />
    </div>
  );
}

function Unit({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => onChange(String(next))}
      items={options.map((option) => ({ label: option, value: option }))}
    >
      <SelectTrigger aria-label={label} className="justify-center gap-1 px-2">
        <SelectValue className="text-strong font-heading font-semibold tabular-nums" />
      </SelectTrigger>
      <SelectContent className="max-h-56">
        {options.map((option) => (
          <SelectItem key={option} value={option} className="font-heading tabular-nums">
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
