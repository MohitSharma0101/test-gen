"use client";

import { useState } from "react";
import { InboxIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { TChapter } from "@/models/Chapter";
import { cn } from "@/lib/utils";

type Props = {
  chapters: TChapter[];
  loading: boolean;
  selectedId?: string;
  // Questions already in the paper, per chapter id
  picked: Record<string, number>;
  onSelect: (chapter: TChapter) => void;
  className?: string;
};

// Searchable chapter list with how many questions each one has in the paper
const ChapterList = ({ chapters, loading, selectedId, picked, onSelect, className }: Props) => {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? chapters.filter((c) => (c.title ?? "").toLowerCase().includes(q)) : chapters;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {chapters.length > 8 && (
        <div className="relative px-3 pb-2">
          <SearchIcon className="pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-[calc(50%+4px)] text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search chapters"
            placeholder="Search chapters"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 pl-9 text-base sm:text-sm"
          />
        </div>
      )}
      {loading && chapters.length === 0 ? (
        <div className="space-y-1.5 px-3" aria-busy="true" aria-label="Loading chapters">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
          <InboxIcon className="size-8" strokeWidth={1.5} />
          {chapters.length ? "No chapters match" : "No chapters in this book"}
        </p>
      ) : (
        <ol className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {shown.map((chapter) => {
            const active = chapter._id === selectedId;
            const count = picked[chapter._id] ?? 0;
            const number = chapters.indexOf(chapter) + 1;
            return (
              <li key={chapter._id}>
                <button
                  type="button"
                  onClick={() => onSelect(chapter)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                    active ? "bg-brand-soft font-semibold text-brand" : "hover:bg-muted"
                  )}
                >
                  <span className={cn("w-5 shrink-0 text-right text-xs tabular-nums", active ? "text-brand" : "text-muted-foreground")}>
                    {number}
                  </span>
                  <span className="min-w-0 flex-1 leading-snug">{chapter.title || "Untitled"}</span>
                  {count > 0 && (
                    <span
                      className="shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-bold leading-none tabular-nums text-brand-foreground"
                      aria-label={`${count} in paper`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default ChapterList;
