import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Accuracy → tone: the same thresholds everywhere in insights
export const accuracyTone = (a: number | null) =>
  a === null ? "bg-muted-foreground/30" : a >= 0.7 ? "bg-emerald-500" : a >= 0.5 ? "bg-amber-400" : "bg-red-500";
export const accuracyText = (a: number | null) =>
  a === null ? "text-muted-foreground" : a >= 0.7 ? "text-emerald-700" : a >= 0.5 ? "text-amber-700" : "text-red-700";
export const pctOf = (a: number | null) => (a === null ? "—" : `${Math.round(a * 100)}%`);

// One labelled horizontal bar (0–100%): label left, value right, the bar on
// the track between, with an optional line of detail under the label.
export const AccuracyBar = ({ label, accuracy, detail, after }: { label: ReactNode; accuracy: number | null; detail?: ReactNode; after?: ReactNode }) => (
  <div className="py-1.5">
    <div className="flex items-baseline gap-2">
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
      {after}
      <span className={cn("w-11 shrink-0 text-right text-sm font-bold tabular-nums", accuracyText(accuracy))}>{pctOf(accuracy)}</span>
    </div>
    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <div className={cn("h-full rounded-full", accuracyTone(accuracy))} style={{ width: `${Math.round((accuracy ?? 0) * 100)}%` }} />
    </div>
    {detail && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{detail}</p>}
  </div>
);
