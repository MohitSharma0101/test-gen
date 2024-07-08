import { cn } from "@/lib/utils";
import { HistoryIcon } from "lucide-react";
import React from "react";

type Props = {
  count?: number;
};

const TimesUsed = ({ count = 0 }: Props) => {
  return (
    <span
      className={cn(
        "flex gap-1 items-center justify-center",
        count <= 2 && "text-green-600",
        count > 2 && "text-amber-500",
        count > 5 && "text-rose-500"
      )}
    >
      <HistoryIcon className="w-4 h-4" />
      {count}
    </span>
  );
};

export default TimesUsed;
