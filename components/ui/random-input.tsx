import React, { ReactNode, useState } from "react";
import { Button } from "./button";
import { ShuffleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  defaultValue?: number;
  onSubmit?: (random: number) => void;
  icon?: ReactNode;
  className?: string;
};

const RandomInput = ({
  onSubmit,
  defaultValue = 5,
  icon,
  className,
}: Props) => {
  const [value, setValue] = useState(defaultValue);
  return (
    <span className={cn("flex items-center justify-center", className)}>
      <input
        value={value}
        type="number"
        min={0}
        onChange={(e) => setValue(Number(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit?.(value);
        }}
        className="px-2 w-[40px] h-8 rounded-l focus-visible:outline-none border-0 no-spinner"
      />
      <Button
        size={"icon"}
        className="rounded-l-none h-8"
        onClick={() => onSubmit?.(value)}
      >
        {icon || <ShuffleIcon className="w-4 h-4" />}
      </Button>
    </span>
  );
};

export default RandomInput;
