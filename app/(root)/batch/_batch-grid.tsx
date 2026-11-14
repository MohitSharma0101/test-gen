"use client";

import { ReactNode, useMemo, useState } from "react";
import { ChevronRightIcon, PencilIcon, SearchIcon, SearchXIcon, UsersIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state-message";
import { TBatchWithCount } from "@/hooks/useBatches";
import { ROUTE_GROUPS } from "@/data/routes";
import { formatINR } from "@/lib/utils";

export const BATCH_TONE = ROUTE_GROUPS.institute.tile;

type Props = {
  batches: TBatchWithCount[];
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onOpen: (batch: TBatchWithCount) => void;
  // Shown on active batches only
  onEdit?: (batch: TBatchWithCount) => void;
  empty: ReactNode;
};

// Shared by /batch and /batch/archive: search + a grid of batch cards
export const BatchGrid = ({ batches, loading, error, onRetry, onOpen, onEdit, empty }: Props) => {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? batches.filter((b) => (b.name ?? "").toLowerCase().includes(q)) : batches;
  }, [batches, query]);

  if (loading && batches.length === 0) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading batches">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-xl" />
        ))}
      </div>
    );
  }
  if (error && batches.length === 0) return <ErrorState message={error} onRetry={onRetry} />;
  if (batches.length === 0) return <>{empty}</>;

  return (
    <div className="space-y-3">
      {/* Search only pays off once the list is long */}
      {batches.length > 6 && (
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search batches"
            placeholder="Search batches"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 bg-card pl-9 text-base sm:text-sm"
          />
        </div>
      )}
      {shown.length === 0 ? (
        <EmptyState className="rounded-2xl border bg-card py-10" tone={BATCH_TONE} icon={<SearchXIcon />} title="No batches match" />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((batch) => (
            <li key={batch._id} className="flex items-center rounded-xl border bg-card shadow-sm transition-colors hover:border-brand/40">
              <button
                type="button"
                onClick={() => onOpen(batch)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{batch.name || "Untitled batch"}</span>
                  <span className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon className="size-3.5" aria-hidden="true" />
                      {batch.totalStudents ?? 0} student{batch.totalStudents === 1 ? "" : "s"}
                    </span>
                    <span>Fee {formatINR(batch.fee)}</span>
                  </span>
                </span>
                {!onEdit && <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              </button>
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(batch)}
                  aria-label={`Edit ${batch.name}`}
                  className="mr-2 flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <PencilIcon className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
