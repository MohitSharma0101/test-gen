"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// shadcn/ui Calendar on react-day-picker v9, styled with our tokens so it
// looks the same on Windows, Mac, Android and iOS (unlike the native picker).
function Calendar({ className, classNames, showOutsideDays = true, ...props }: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex h-9 items-center justify-center",
        caption_label: "text-sm font-bold",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous:
          "flex size-9 items-center justify-center rounded-full hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        button_next:
          "flex size-9 items-center justify-center rounded-full hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-10 text-center text-[11px] font-medium uppercase text-muted-foreground",
        week: "mt-1 flex",
        day: "size-10 p-0 text-center text-sm",
        day_button:
          "size-10 rounded-full tabular-nums transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        selected: "[&>button]:bg-brand [&>button]:font-bold [&>button]:text-brand-foreground [&>button:hover]:bg-brand",
        today: "[&>button]:font-bold [&>button]:text-brand",
        outside: "text-muted-foreground/50",
        disabled: "pointer-events-none text-muted-foreground/40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? <ChevronLeftIcon className="size-4" /> : <ChevronRightIcon className="size-4" />,
      }}
      {...props}
    />
  );
}

export { Calendar };
