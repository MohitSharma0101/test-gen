"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CalendarClockIcon,
  FilesIcon,
  FileTextIcon,
  MergeIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchXIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import usePapers from "@/hooks/usePapers";
import { cn, getDateFromISO, getTotalMarks } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import PreviewButton from "@/components/ui/preview-button-v2";
import { postUpdateUsage } from "@/service/core.service";
import DeleteButton from "@/components/ui/delete-button";
import { Button, buttonVariants } from "@/components/ui/button";
import SelectCompact from "@/components/ui/select-compact";
import { PaperStatus, PaperStatusOptions } from "@/data/const";
import { ROUTE_GROUPS } from "@/data/routes";
import Pagination from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/state-message";
import { PaperStatusBadge } from "@/components/ui/paper-status-badge";
import { ResponsiveList, type ListColumn } from "@/components/ui/responsive-list";
import { SchedulePaperSheet } from "@/components/sheets/schedule-paper-sheet";
import { MergePaperSheet } from "@/components/sheets/merge-paper-sheet";
import { ViewPaperSheet } from "@/components/sheets/view-paper-sheet";
import { useCourses } from "@/hooks/useCourses";
import { useAuthors } from "@/hooks/useAuthors";
import type { TPaper } from "@/models/Paper";

const PAPERS_TONE = ROUTE_GROUPS.papers.tile;

// Anything missing on an old paper shows as a dash rather than breaking
const questionsOf = (paper: TPaper) => paper.questions ?? [];
const dateOf = (iso?: string) => (iso ? getDateFromISO(iso) : "—");

const iconButton = "size-9 shrink-0 p-0 md:size-8";

type PaperHandlers = {
  isSelected: (paper: TPaper) => boolean;
  onSelect: (paper: TPaper, checked: boolean) => void;
  onOpen: (paper: TPaper) => void;
  onSchedule: (paper: TPaper) => void;
  onDelete: (paper: TPaper) => void;
};

const SelectBox = ({ paper, h, className }: { paper: TPaper; h: PaperHandlers; className?: string }) => (
  <Checkbox
    checked={h.isSelected(paper)}
    onCheckedChange={(c) => h.onSelect(paper, Boolean(c))}
    aria-label={`Select "${paper.title}"`}
    className={className}
  />
);

const PaperActions = ({ paper, h }: { paper: TPaper; h: PaperHandlers }) => (
  <>
    <Button
      variant="ghost"
      className={iconButton}
      onClick={() => h.onSchedule(paper)}
      aria-label={`Schedule "${paper.title}" as an online test`}
      title="Schedule online test"
    >
      <CalendarClockIcon className="size-4" />
    </Button>
    <PreviewButton
      // The list carries marks only; the full paper is fetched when opened
      paperId={paper._id}
      questions={questionsOf(paper)}
      defaultTwoColumn
      onPrint={() => postUpdateUsage(questionsOf(paper))}
      variant="outline"
      className="h-9 px-3 md:h-8"
    />
    <DeleteButton
      variant="ghost"
      className={cn(iconButton, "text-red-600 hover:bg-red-50 hover:text-red-700")}
      title={`Delete "${paper.title}"?`}
      description="This removes the paper. Its questions stay in the question bank."
      onDelete={(close) => {
        h.onDelete(paper);
        close();
      }}
    >
      <Trash2Icon className="size-4" aria-label={`Delete "${paper.title}"`} />
    </DeleteButton>
  </>
);

const PaperCard = ({ paper, h }: { paper: TPaper; h: PaperHandlers }) => {
  const qs = questionsOf(paper);
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3 shadow-sm transition-colors",
        h.isSelected(paper) && "border-brand/40 bg-brand-soft/40"
      )}
    >
      <div className="flex items-start gap-3">
        <SelectBox paper={paper} h={h} className="mt-1 size-5" />
        <button type="button" onClick={() => h.onOpen(paper)} className="min-w-0 flex-1 text-left">
          <span className="flex items-start justify-between gap-2">
            <span className="line-clamp-2 font-bold leading-snug">{paper.title || "Untitled paper"}</span>
            <PaperStatusBadge status={paper.status} />
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            <span className="tabular-nums">
              {qs.length} questions · {getTotalMarks(qs)} marks
            </span>
            {paper.course && <> · Class {paper.course}</>}
          </span>
          <span className="block text-xs text-muted-foreground">
            {paper.author || "No author"} · Updated {dateOf(paper.updatedAt)}
          </span>
        </button>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 border-t pt-2">
        <Button variant="ghost" className="mr-auto h-9 px-2 text-brand" onClick={() => h.onOpen(paper)}>
          Open
        </Button>
        <PaperActions paper={paper} h={h} />
      </div>
    </div>
  );
};

const paperColumns = (h: PaperHandlers): ListColumn<TPaper>[] => [
  { header: "Select", srOnlyHeader: true, width: "w-11", cell: (p) => <SelectBox paper={p} h={h} /> },
  {
    header: "Paper",
    cell: (p) => (
      <>
        <button
          type="button"
          onClick={() => h.onOpen(p)}
          className="block w-full truncate text-left font-medium hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          title={p.title}
        >
          {p.title || "Untitled paper"}
        </button>
        <span className="text-xs text-muted-foreground">{p.author || "No author"}</span>
      </>
    ),
  },
  { header: "Qs", width: "w-16", align: "right", cell: (p) => questionsOf(p).length },
  { header: "Marks", width: "w-16", align: "right", cell: (p) => getTotalMarks(questionsOf(p)) },
  { header: "Class", width: "w-20", cell: (p) => p.course || "—" },
  { header: "Status", width: "w-24", cell: (p) => <PaperStatusBadge status={p.status} /> },
  {
    header: "Updated",
    width: "w-32",
    className: "whitespace-nowrap text-xs text-muted-foreground",
    cell: (p) => (
      <>
        <span className="block">{dateOf(p.updatedAt)}</span>
        <span className="block">Created {dateOf(p.createdAt)}</span>
      </>
    ),
  },
  {
    header: "Actions",
    srOnlyHeader: true,
    width: "w-[11.5rem]",
    cell: (p) => (
      <div className="flex items-center justify-end gap-1">
        <PaperActions paper={p} h={h} />
      </div>
    ),
  },
];

const PapersPage = () => {
  const { authors, author, updateAuthor } = useAuthors();
  const { course, setCourse, courses } = useCourses({ stopDefaultSelection: true });
  const [status, setStatus] = useState(PaperStatus.PUBLIC);
  const [schedulePaperId, setSchedulePaperId] = useState<string | null>(null);
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
  const [openMergePapers, setOpenMergePapers] = useState(false);
  const [viewPaperId, setViewPaperId] = useState<string | null>(null);

  const { papers, data, loading, error, deletePaper, refresh } = usePapers({ author, course, status });

  const isFilterApplied = Boolean(author || course || status !== PaperStatus.PUBLIC);
  const onClearFilter = () => {
    if (author) updateAuthor();
    if (course) setCourse("");
    setStatus(PaperStatus.PUBLIC);
  };

  const handlers: PaperHandlers = {
    isSelected: (p) => selectedPapers.includes(p._id),
    onSelect: (p, checked) =>
      setSelectedPapers((prev) => (checked ? [...prev.filter((id) => id !== p._id), p._id] : prev.filter((id) => id !== p._id))),
    onOpen: (p) => setViewPaperId(p._id),
    onSchedule: (p) => setSchedulePaperId(p._id),
    onDelete: (p) => {
      setSelectedPapers((prev) => prev.filter((id) => id !== p._id));
      deletePaper(p._id);
    },
  };

  const total = data?.totalPapers;
  const createPaperClass = cn(buttonVariants({ variant: "brand" }), "gap-2");

  const content = () => {
    if (loading && papers.length === 0) {
      return (
        <div className="space-y-2" aria-busy="true" aria-label="Loading papers">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-xl md:h-14" />
          ))}
        </div>
      );
    }
    if (error) {
      return <ErrorState message="Couldn't load papers." onRetry={refresh} className="rounded-2xl border bg-card py-12" />;
    }
    if (papers.length === 0) {
      return (
        <EmptyState
          className="rounded-2xl border bg-card py-12"
          tone={PAPERS_TONE}
          icon={isFilterApplied ? <SearchXIcon /> : <FileTextIcon />}
          title={isFilterApplied ? "No papers match these filters" : "No papers yet"}
          description={isFilterApplied ? "Try another author, class or status." : "Papers you save will show up here."}
          action={
            isFilterApplied ? (
              <Button variant="outline" onClick={onClearFilter}>
                Clear filters
              </Button>
            ) : (
              <Link href="/create-paper" className={createPaperClass}>
                <PlusIcon className="size-4" /> Create paper
              </Link>
            )
          }
        />
      );
    }
    return (
      <ResponsiveList
        rows={papers}
        rowKey={(p) => p._id}
        columns={paperColumns(handlers)}
        renderCard={(p) => <PaperCard paper={p} h={handlers} />}
        rowClassName={(p) => (handlers.isSelected(p) ? "bg-brand-soft/50 hover:bg-brand-soft/60" : undefined)}
        busy={loading}
      />
    );
  };

  return (
    <main className={cn("mx-auto w-full max-w-6xl space-y-4 px-4 pt-5 sm:px-6", selectedPapers.length > 0 ? "pb-28" : "pb-12")}>
      <PageHeader
        icon={<FilesIcon />}
        tone={PAPERS_TONE}
        title="Papers"
        description={
          typeof total === "number" ? `${total} paper${total === 1 ? "" : "s"}` : "Find, print and share saved papers"
        }
        actions={
          <>
            <Button variant="outline" onClick={refresh} disabled={loading} aria-label="Refresh" className="size-10 p-0">
              <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
            </Button>
            <Link href="/create-paper" className={cn(createPaperClass, "h-10")}>
              <PlusIcon className="size-4" />
              <span className="hidden sm:inline">Create paper</span>
              <span className="sr-only sm:hidden">Create paper</span>
            </Link>
          </>
        }
      />

      {/* One row of filters; scrolls sideways on narrow phones (py-1 keeps the
          focus ring from being clipped by the scroll box) */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 py-1 scrollbar-hide sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <SelectCompact
          options={authors.map((a) => ({ label: a, value: a }))}
          placeholder="Any author"
          value={author}
          onChange={updateAuthor}
          className="w-40 shrink-0 sm:w-48"
          canUnselect
        />
        <SelectCompact
          options={courses.map((c) => ({ label: `Class ${c}`, value: c }))}
          placeholder="Any class"
          value={course}
          onChange={setCourse}
          className="w-32 shrink-0 sm:w-40"
          canUnselect
        />
        <SelectCompact
          options={PaperStatusOptions}
          placeholder="Status"
          value={status}
          onChange={(v) => setStatus((v as PaperStatus) || PaperStatus.PUBLIC)}
          className="w-32 shrink-0 sm:w-40"
        />
        {isFilterApplied && (
          <Button variant="ghost" onClick={onClearFilter} className="h-9 shrink-0 gap-1 px-2 text-brand">
            <XIcon className="size-4" /> Clear
          </Button>
        )}
      </div>

      {content()}

      {papers.length > 0 && <Pagination totalPages={data?.totalPages} hideLimit />}

      {/* Selection bar: floats above the page while papers are picked */}
      {selectedPapers.length > 0 && (
        <div
          role="region"
          aria-label="Selected papers"
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-xl items-center gap-2 rounded-2xl border bg-card p-2 pl-4 shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4"
        >
          <span className="text-sm font-bold tabular-nums">{selectedPapers.length} selected</span>
          <Button variant="ghost" onClick={() => setSelectedPapers([])} className="h-10 px-3">
            Clear
          </Button>
          <Button
            variant="brand"
            onClick={() => setOpenMergePapers(true)}
            disabled={selectedPapers.length < 2}
            title={selectedPapers.length < 2 ? "Select 2 or more papers to merge" : undefined}
            className="ml-auto h-10 gap-2"
          >
            <MergeIcon className="size-4" />
            Merge{selectedPapers.length < 2 ? " (pick 2+)" : ""}
          </Button>
        </div>
      )}

      {schedulePaperId && (
        <SchedulePaperSheet
          paperId={schedulePaperId}
          open={Boolean(schedulePaperId)}
          onOpenChange={() => setSchedulePaperId(null)}
        />
      )}
      {openMergePapers && (
        <MergePaperSheet
          open={openMergePapers}
          onOpenChange={setOpenMergePapers}
          paperIds={selectedPapers}
          onClear={() => {
            setSelectedPapers([]);
            setOpenMergePapers(false);
          }}
          onRefresh={refresh}
        />
      )}
      {viewPaperId && (
        <ViewPaperSheet
          paperId={viewPaperId}
          open={Boolean(viewPaperId)}
          onOpenChange={(open) => {
            if (!open) setViewPaperId(null);
          }}
        />
      )}
    </main>
  );
};

export default PapersPage;
