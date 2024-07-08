import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

type Props = {
  placeholder?: string;
  className?: string;
  options: {
    label: string;
    value: string;
  }[];
  value?: string;
  label?: string;
  onChange?: (value: string) => void;
};

const SelectCompact = ({
  placeholder,
  className,
  options,
  value,
  label,
  onChange,
}: Props) => {
  return (
    <div className={className}>
      <label className="block font-medium ml-1 mb-1 text-sm">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder || "Select a value"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SelectCompact;
