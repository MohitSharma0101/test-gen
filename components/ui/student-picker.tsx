"use client";

import { useMemo, useState } from "react";
import { LockIcon, SearchIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import useUsers from "@/hooks/useUsers";
import { cn } from "@/lib/utils";

type Props = {
  batchId: string;
  value: string[];
  onChange: (ids: string[]) => void;
  // Ticked and can't be unticked, e.g. students who already attempted the test
  lockedIds?: string[];
  className?: string;
  // Fill the drawer: the whole list scrolls with the drawer (search stays on top)
  // instead of a small box with its own scroll bar
  fill?: boolean;
};

/** Searchable checklist of a batch's students, for choosing who takes a test. */
export function StudentPicker({ batchId, value, onChange, lockedIds = [], className, fill }: Props) {
  const { users, loading } = useUsers({ batchId });
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  const locked = useMemo(() => new Set(lockedIds), [lockedIds]);

  const q = query.trim().toLowerCase();
  const shown = q
    ? users.filter((u) => u.name?.toLowerCase().includes(q) || String(u.userId ?? "").toLowerCase().includes(q))
    : users;

  const toggle = (id: string) => {
    if (locked.has(id)) return;
    onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);
  };
  // Select all / Clear act on what's visible, so a search narrows them
  const allShownSelected = shown.length > 0 && shown.every((u) => selected.has(u._id));
  const toggleAll = () => {
    const ids = shown.map((u) => u._id);
    if (allShownSelected) onChange(value.filter((v) => !ids.includes(v) || locked.has(v)));
    else onChange(Array.from(new Set([...value, ...ids])));
  };

  return (
    <div className={cn(fill ? "" : "rounded-xl border", className)}>
      <div className={cn("flex items-center gap-2 border-b p-2", fill && "sticky top-0 z-10 -mx-4 bg-card px-4")}>
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or ID"
            aria-label="Search students"
            className={cn("w-full rounded-md border bg-background pl-8 pr-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand", fill ? "h-11" : "h-9")}
          />
        </div>
        <button
          type="button"
          onClick={toggleAll}
          disabled={!shown.length}
          className={cn("shrink-0 rounded-md px-2 text-sm font-medium text-brand hover:bg-muted disabled:opacity-50", fill ? "h-11" : "h-9")}
        >
          {allShownSelected ? "Clear" : "Select all"}
        </button>
      </div>
      <p className="px-3 pt-2 text-xs text-muted-foreground">
        {value.length} of {users.length} selected
      </p>
      <ul className={fill ? "divide-y" : "max-h-72 overflow-y-auto overscroll-contain p-1"}>
        {loading && !users.length
          ? [0, 1, 2, 3].map((i) => (
              <li key={i} className="p-2">
                <Skeleton className="h-6 w-full" />
              </li>
            ))
          : shown.map((u) => {
              const isLocked = locked.has(u._id);
              return (
                <li key={u._id}>
                  <label
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm",
                      isLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:bg-muted"
                    )}
                    title={isLocked ? "Already attempted this test" : undefined}
                  >
                    <Checkbox checked={selected.has(u._id)} disabled={isLocked} onCheckedChange={() => toggle(u._id)} />
                    <span className="min-w-0 flex-1 truncate">{u.name}</span>
                    {u.userId && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{u.userId}</span>}
                    {isLocked && <LockIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label="Already attempted" />}
                  </label>
                </li>
              );
            })}
        {!loading && !shown.length && (
          <li className="p-4 text-center text-sm text-muted-foreground">{q ? "No students match" : "No students in this batch"}</li>
        )}
      </ul>
    </div>
  );
}
