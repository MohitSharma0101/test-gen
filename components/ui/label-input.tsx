import React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

type Props = JSX.IntrinsicElements["input"] & {
  label: string;
  className?: string;
};

const LabelInput = ({ label, className, ...props }: Props) => {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="text-xs font-medium">{label}</label>
      <Input {...props} />
    </div>
  );
};

export default LabelInput;
