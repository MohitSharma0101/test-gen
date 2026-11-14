import React, { useId } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

type Props = JSX.IntrinsicElements["input"] & {
  label: string;
  // On the wrapper (layout), as before
  className?: string;
  // On the input itself
  inputClassName?: string;
};

const LabelInput = ({ label, className, inputClassName, id, ...props }: Props) => {
  // Linked label: tapping it focuses the field, screen readers announce it
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={inputId} className="ml-1 text-xs font-medium">
        {label}
      </label>
      <Input id={inputId} className={inputClassName} {...props} />
    </div>
  );
};

export default LabelInput;
