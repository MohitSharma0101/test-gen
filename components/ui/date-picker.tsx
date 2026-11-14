"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/lib/utils";

// Date-only picker. Value is "YYYY-MM-DD" (same as <input type="date">), so it
// drops in where a native date input was.
type Props = {
  value?: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  label?: string;
  className?: string;
  // Shown instead of the date when the value is `today`, e.g. "Today"
  todayLabel?: string;
  // "YYYY-MM-DD" in the app's time zone (Clock.getDate()). Passed in rather than
  // read from the device clock: the server (UTC) and a phone (IST) can disagree
  // about the date, which broke hydration and the "Today" label
  today?: string;
  placeholder?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromDateKey = (key?: string) => {
  if (!key) return undefined;
  const [y, m, d] = key.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : undefined;
};

export const DatePicker = ({ value, onChange, min, max, disabled, label, className, todayLabel, today, placeholder = "Pick a date" }: Props) => {
  const [open, setOpen] = useState(false);
  const selected = fromDateKey(value);
  const minDate = fromDateKey(min);
  const maxDate = fromDateKey(max);
  const isToday = Boolean(today) && value === today;

  const text = selected
    ? isToday && todayLabel
      ? todayLabel
      : // Printed from noon UTC of that calendar day in UTC, so the server and
        // any device, whatever its time zone, print the same date
        new Date(`${value}T12:00:00Z`).toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })
    : placeholder;

  return (
    <div className={cn("space-y-1", className)}>
      {label && <p className="ml-1 text-xs font-medium">{label}</p>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            "flex h-10 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{text}</span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
            onSelect={(d) => {
              if (!d) return;
              onChange(toDateKey(d));
              setOpen(false);
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
