"use client";

import { useState } from "react";
import { ChevronDownIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TJob } from "@/models/Job";

type Props = {
  job: TJob | null;
  label: string;
  onCancel?: () => void;
  onDismiss?: () => void;
};

const when = (value?: string) =>
  value ? new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

/** Progress card for any background job (lib/jobs). */
export function JobProgress({ job, label, onCancel, onDismiss }: Props) {
  const [showFailed, setShowFailed] = useState(false);
  if (!job) return null;
  const active = job.status === "queued" || job.status === "running";
  const pct = job.total ? Math.min(100, Math.round((job.done / job.total) * 100)) : 0;

  const text = {
    queued: `${label}: starting…`,
    running: `${label}: ${job.done} of ${job.total}`,
    done: `${label}: finished ${job.done} of ${job.total}${job.failed.length ? `, ${job.failed.length} failed` : ""}`,
    failed: `${label} stopped at ${job.done} of ${job.total}: ${job.error ?? "error"}`,
    cancelled: `${label} cancelled at ${job.done} of ${job.total}`,
  }[job.status];

  return (
    <section aria-live="polite" className="rounded-xl border bg-card p-3 text-sm">
      <div className="flex items-center gap-2">
        {active && <Loader2Icon className="size-4 shrink-0 animate-spin text-brand" aria-hidden="true" />}
        <div className="min-w-0 flex-1">
          <p className="font-medium">{text}</p>
          <p className="text-xs text-muted-foreground">
            {active ? "Runs on the server: you can leave this page." : `Ended ${when(job.finishedAt ?? job.updatedAt)}`}
            {job.startedBy ? ` · started by ${job.startedBy}` : ""}
          </p>
        </div>
        {active && onCancel && (
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {!active && onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Close
          </Button>
        )}
      </div>
      {(active || job.total > 0) && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      )}
      {job.failed.length > 0 && (
        <div className="mt-2">
          <button type="button" onClick={() => setShowFailed((v) => !v)} className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
            {job.failed.length} failed <ChevronDownIcon className={`size-3.5 transition-transform ${showFailed ? "rotate-180" : ""}`} />
          </button>
          {showFailed && (
            <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto text-xs text-muted-foreground">
              {job.failed.map((f) => (
                <li key={f.key} className="break-all">
                  <span className="font-mono">{f.key}</span>: {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
