import { cn } from "@/lib/utils";
import type { TAiRequestStatus } from "@/models/AiRequest";

const META: Record<TAiRequestStatus, { label: string; className: string; dot?: string }> = {
  queued: { label: "Queued for tonight", className: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  running: { label: "Generating", className: "bg-brand-soft text-brand", dot: "bg-brand motion-safe:animate-pulse" },
  review: { label: "Ready to review", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  failed: { label: "Failed", className: "bg-red-50 text-red-700", dot: "bg-red-500" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

export function AiStatusBadge({ status, className }: { status: TAiRequestStatus; className?: string }) {
  const m = META[status] ?? META.queued;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", m.className, className)}>
      {m.dot && <span className={cn("size-1.5 rounded-full", m.dot)} aria-hidden="true" />}
      {m.label}
    </span>
  );
}
