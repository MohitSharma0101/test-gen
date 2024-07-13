import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Skeleton } from "./skeleton";

export type TSelectCompactProps = {
  placeholder?: string;
  className?: string;
  options: {
    label: string;
    value: string;
  }[];
  value?: string;
  label?: string;
  onChange?: (value: string) => void;
  emptyState?: string;
  loading?: boolean
};

const SelectCompact = ({
  placeholder,
  className,
  options,
  value,
  label,
  onChange,
  emptyState,
  loading
}: TSelectCompactProps) => {
  return (
    <div className={className}>
      <label className="block font-medium ml-1 mb-1 text-sm">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder || "Select a value"} />
        </SelectTrigger>
        <SelectContent>
          {loading ? (
            <div className="flex flex-col gap-2 p-1">
              <Skeleton className="w-full h-6"/>
              <Skeleton className="w-full h-6"/>
            </div>
          ) : options.length === 0 ? (
            <p className="text-sm font-medium p-2 text-slate-600">{emptyState || 'Nothing to select!'}</p>
          ) : (
            options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SelectCompact;
