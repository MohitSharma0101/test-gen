import { PaperStatus } from "@/data/const";
import { cn } from "@/lib/utils";

const STYLE: Record<PaperStatus, string> = {
  [PaperStatus.PUBLIC]: "bg-emerald-50 text-emerald-700",
  [PaperStatus.PRIVATE]: "bg-slate-100 text-slate-700",
  [PaperStatus.DRAFT]: "bg-amber-50 text-amber-800",
  [PaperStatus.ONLINE]: "bg-blue-50 text-blue-700",
};

const LABEL: Record<PaperStatus, string> = {
  [PaperStatus.PUBLIC]: "Public",
  [PaperStatus.PRIVATE]: "Private",
  [PaperStatus.DRAFT]: "Draft",
  [PaperStatus.ONLINE]: "Online",
};

// A paper's status, the same everywhere it appears. Unknown or missing
// statuses render as a neutral dash instead of breaking.
export const PaperStatusBadge = ({ status, className }: { status?: PaperStatus | string; className?: string }) => {
  const known = status && status in STYLE ? (status as PaperStatus) : undefined;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
        known ? STYLE[known] : "bg-muted text-muted-foreground",
        className
      )}
    >
      {known ? LABEL[known] : "—"}
    </span>
  );
};
