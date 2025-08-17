"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export type TOption = {
  label: string;
  value: string;
};

export type MultiSelectProps = {
  options: TOption[];
  label: string;
  selectedOptions?: TOption[];
  className?: string;
  onSelectChange?: (options: TOption[]) => void;
  hideClearButton?: boolean;
  maxSelectionDisplay?: number;
};

const MultiSelect = ({
  label,
  options,
  selectedOptions = [],
  className,
  onSelectChange,
  hideClearButton,
  maxSelectionDisplay = 3,
}: MultiSelectProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={"outline"}
          className={cn("justify-start h-fit min-w-fit", className)}
        >
          {label}:
          {selectedOptions.length === 0 ? (
            <p className="text-xs ml-2 text-slate-400"> Nothing Selected</p>
          ) : (
            <div className="ml-2 flex gap-1 items-center justify-start text-sm">
              {selectedOptions.slice(0, maxSelectionDisplay).map((opt) => (
                <span
                  key={opt.label}
                  className="px-2 py-1 rounded-full bg-slate-200 text-xs"
                >
                  {opt.label}
                </span>
              ))}
              {selectedOptions.length > maxSelectionDisplay && (
                <span className="text-xs bg-slate-200 px-2 py-1 rounded-full">
                  +{selectedOptions.length - maxSelectionDisplay}
                </span>
              )}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 z-[600]">
        <DropdownMenuLabel className="w-full flex items-center py-1">
          Choose
          {!hideClearButton && (
            <Button
              variant={"destructive"}
              size={"sm"}
              className="ml-auto text-xs h-7"
              onClick={() => onSelectChange?.([])}
            >
              Clear
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt.label}
            checked={Boolean(
              selectedOptions?.find((item) => item.label === opt.label)
            )}
            onCheckedChange={(checked) => {
              if (checked) {
                onSelectChange?.([...selectedOptions, opt]);
              } else {
                onSelectChange?.(
                  selectedOptions.filter((item) => item.label !== opt.label)
                );
              }
            }}
          >
            {opt.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MultiSelect;
