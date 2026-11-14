"use client";

import { useEffect, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import SelectCompact from "./select-compact";
import { cn } from "@/lib/utils";

// Same value format as <input type="datetime-local">: "YYYY-MM-DDTHH:mm" in
// local time, so callers and the API don't change.
type Props = {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  // Earliest selectable date (only the date part is used)
  min?: string;
  disabled?: boolean;
  defaultTime?: string; // "HH:mm", used when a date is picked first
  className?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromDateKey = (key?: string) => {
  if (!key) return undefined;
  const [y, m, d] = key.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : undefined;
};

// Every 15 minutes, labelled like "9:15 AM"
export const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  const label = `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
  return { label, value: `${pad(h)}:${pad(m)}` };
});

const dateLabel = (d?: Date) =>
  d ? d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";

export const DateTimePicker = ({ label, value, onChange, min, disabled, defaultTime = "09:00", className }: Props) => {
  const [datePart, timePart] = (value ?? "").split("T");
  const [date, setDate] = useState<string>(datePart ?? "");
  const [time, setTime] = useState<string>(timePart?.slice(0, 5) ?? "");
  const [open, setOpen] = useState(false);

  // Follow outside changes (e.g. a reset)
  useEffect(() => {
    const [d, t] = (value ?? "").split("T");
    setDate(d ?? "");
    setTime(t?.slice(0, 5) ?? "");
  }, [value]);

  const emit = (d: string, t: string) => onChange(d && t ? `${d}T${t}` : "");

  const selected = fromDateKey(date);
  const minDate = fromDateKey(min?.split("T")[0]);

  return (
    <div className={cn("space-y-1", className)}>
      <p className="ml-1 text-xs font-medium">{label}</p>
      <div className="grid grid-cols-[1fr_8.5rem] gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            disabled={disabled}
            className={cn(
              "flex h-10 min-w-0 items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50",
              !selected && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{selected ? dateLabel(selected) : "Pick a date"}</span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selected}
              defaultMonth={selected ?? minDate}
              disabled={minDate ? { before: minDate } : undefined}
              onSelect={(d) => {
                const key = d ? toDateKey(d) : "";
                const t = time || (key ? defaultTime : "");
                setDate(key);
                setTime(t);
                emit(key, t);
                setOpen(false);
              }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
        <SelectCompact
          placeholder="Time"
          options={TIME_OPTIONS}
          value={time}
          disabled={disabled}
          onChange={(t) => {
            setTime(t);
            emit(date, t);
          }}
          className="min-w-0"
        />
      </div>
    </div>
  );
};
