"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BotIcon, ChevronRightIcon, PlusIcon, SearchIcon, SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/state-message";
import { ListColumn, ResponsiveList } from "@/components/ui/responsive-list";
import SelectCompact from "@/components/ui/select-compact";
import { AiStatusBadge } from "@/components/ai-requests/status-badge";
import { NewAiRequestSheet } from "@/components/sheets/new-ai-request-sheet";
import { useAiRequests } from "@/hooks/useAiRequests";
import { ROUTE_GROUPS } from "@/data/routes";
import type { TAiRequestSummary } from "@/lib/aiRequests";

const STATUS_FILTERS = [
  { label: "All requests", value: "all" },
  { label: "Ready to review", value: "review" },
  { label: "Queued", value: "queued" },
  { label: "Generating", value: "running" },
  { label: "Failed", value: "failed" },
];

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// What the row says next to the status: the one number that matters now
const progressText = (r: TAiRequestSummary) => {
  if (r.status === "review") return r.counts.pending ? `${r.counts.pending} to review` : `${r.counts.approved} approved, ready to add`;
  if (r.status === "running") return `${r.counts.total} of ${r.expected} made`;
  if (r.status === "queued") return `${r.expected} question${r.expected === 1 ? "" : "s"}`;
  return r.error ? "See details" : "";
};

// Pattern 1 - List / Index: the AI requests, newest first. Create opens a
// slide-over; a row opens the request (Detail) to review its drafts.
export default function AiRequestsPage() {
  const router = useRouter();
  const { requests, loading, firstLoad, error, refresh } = useAiRequests();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const q = query.trim().toLowerCase();
  const rows = requests.filter(
    (r) => (status === "all" || r.status === status) && (!q || `${r.title} ${r.chapterTitle ?? ""}`.toLowerCase().includes(q))
  );

  const columns: ListColumn<TAiRequestSummary>[] = [
    {
      header: "Request",
      cell: (r) => (
        <Link href={`/ai-requests/${r._id}`} className="block min-w-0">
          <span className="block truncate font-semibold text-brand hover:underline">{r.title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {r.bookTitle} › {r.chapterTitle}
          </span>
        </Link>
      ),
    },
    { header: "Status", width: "w-44", cell: (r) => <AiStatusBadge status={r.status} /> },
    { header: "Progress", width: "w-44", cell: (r) => <span className="text-sm tabular-nums">{progressText(r)}</span> },
    { header: "Requested", width: "w-32", cell: (r) => <span className="text-sm text-muted-foreground">{day(r.createdAt)}</span> },
    { header: "Open", srOnlyHeader: true, width: "w-10", cell: () => <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" /> },
  ];

  const card = (r: TAiRequestSummary) => (
    <Link href={`/ai-requests/${r._id}`} className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm active:bg-muted">
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-semibold leading-snug">{r.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {r.chapterTitle} · {day(r.createdAt)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <AiStatusBadge status={r.status} />
          <span className="text-xs tabular-nums text-muted-foreground">{progressText(r)}</span>
        </div>
      </div>
      <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );

  const body = () => {
    if (error) return <ErrorState message={error} onRetry={refresh} className="rounded-2xl border bg-card py-12" />;
    if (firstLoad)
      return (
        <div className="space-y-2" aria-busy="true" aria-label="Loading requests">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      );
    if (!requests.length)
      return (
        <EmptyState
          className="rounded-2xl border bg-card py-12"
          icon={<BotIcon strokeWidth={1.5} />}
          title="No requests yet"
          description="Ask for variants of a few questions, or questions on a topic. Claude writes them tonight."
          action={
            <Button variant="brand" className="h-11 gap-2" onClick={() => setCreating(true)}>
              <PlusIcon className="size-4" /> New request
            </Button>
          }
        />
      );
    if (!rows.length)
      return <EmptyState className="rounded-2xl border bg-card py-10" icon={<SearchXIcon />} title="Nothing matches" description="Try another search or status." />;
    return <ResponsiveList rows={rows} rowKey={(r) => r._id} columns={columns} renderCard={card} busy={loading} />;
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-12 pt-5 sm:px-6">
      <PageHeader
        icon={<BotIcon />}
        tone={ROUTE_GROUPS.bank.tile}
        title="AI requests"
        description="Questions Claude writes overnight, for you to review"
        actions={
          <Button variant="brand" className="h-10 gap-2" onClick={() => setCreating(true)}>
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">New request</span>
            <span className="sr-only sm:hidden">New request</span>
          </Button>
        }
      />

      {requests.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 basis-56">
            <label htmlFor="ai-search" className="ml-1 text-xs font-medium">
              Search
            </label>
            <div className="relative mt-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                id="ai-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Request or chapter"
                className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </div>
          </div>
          <SelectCompact label="Status" options={STATUS_FILTERS} value={status} onChange={setStatus} className="w-44" />
        </div>
      )}

      {body()}

      <NewAiRequestSheet open={creating} onOpenChange={setCreating} onCreated={(id) => id && router.push(`/ai-requests/${id}`)} />
    </main>
  );
}
