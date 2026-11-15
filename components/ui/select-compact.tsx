import { cn } from "@/lib/utils";
import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Skeleton } from "./skeleton";
import { Button } from "./button";

export type TSelectCompactProps = {
  placeholder?: string;
  className?: string;
  options: {
    label: string;
    value: string;
    // A short badge shown after the label, e.g. "Paid"
    tag?: string;
    // "warning" (amber, the default, e.g. "Paid") or "info" (brand, e.g. "30Q")
    tagTone?: "warning" | "info";
    // Several badges, coloured by name (see TAG_STYLES)
    tags?: string[];
  }[];
  value?: string;
  label?: string;
  onChange?: (value: string) => void;
  emptyState?: string;
  loading?: boolean;
  triggerClassName?: string;
  canUnselect?: boolean;
  disabled?: boolean;
};

// Badge colours by tag; anything else is neutral
const TAG_STYLES: Record<string, string> = {
  Paid: "border-amber-300 bg-amber-50 text-amber-800",
  "Free tier": "border-green-300 bg-green-50 text-green-800",
  Default: "border-brand/30 bg-brand-soft text-brand",
  default: "border-slate-300 bg-slate-50 text-slate-700",
};

const SelectCompact = ({
  placeholder,
  className,
  options,
  value,
  label,
  onChange,
  emptyState,
  loading,
  triggerClassName,
  canUnselect,
  disabled,
}: TSelectCompactProps) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      {label && (
        <>
          <label className="font-medium ml-1 mb-1 text-xs flex gap-2 items-center">
            {label}
          </label>
        </>
      )}

      <Select
        value={value}
        onValueChange={onChange}
        open={open}
        onOpenChange={setOpen}
        disabled={disabled}
      >
        {/* The visible label isn't wired to the trigger, so name it directly
            (screen readers, and tests finding it by role + name) */}
        <SelectTrigger className={triggerClassName} aria-label={label || placeholder}>
          <SelectValue placeholder={placeholder || "Select a value"} />
        </SelectTrigger>
        <SelectContent>
          {loading ? (
            <div className="flex flex-col gap-2 p-1">
              <Skeleton className="w-full h-6" />
              <Skeleton className="w-full h-6" />
            </div>
          ) : options.length === 0 ? (
            <p className="text-sm font-medium p-2 text-slate-600">
              {emptyState || "Nothing to select!"}
            </p>
          ) : (
            options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                suffix={
                  option.tags?.length ? (
                    <span className="ml-1.5 flex flex-wrap gap-1">
                      {option.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`rounded border px-1 py-px text-[10px] font-semibold uppercase tracking-wide ${
                            TAG_STYLES[tag] || TAG_STYLES.default
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  ) : undefined
                }
              >
                {option.label}
                {option.tag && (
                  <span
                    className={cn(
                      "ml-1.5 rounded border px-1 py-px text-[10px] font-semibold uppercase tracking-wide",
                      option.tagTone === "info"
                        ? "border-brand/30 bg-brand-soft text-brand"
                        : "border-amber-300 bg-amber-50 text-amber-800"
                    )}
                  >
                    {option.tag}
                  </span>
                )}
              </SelectItem>
            ))
          )}
          {canUnselect && value && (
            <Button
              variant={"destructive"}
              className="w-full py-1 underline text-sm"
              onClick={() => {
                onChange?.("");
                setOpen(false);
              }}
            >
              Clear Selection
            </Button>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SelectCompact;
