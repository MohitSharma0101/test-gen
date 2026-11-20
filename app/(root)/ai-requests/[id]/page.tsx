"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  CheckIcon,
  ChevronDownIcon,
  EllipsisVerticalIcon,
  Loader2Icon,
  MoonStarIcon,
  PencilIcon,
  TrashIcon,
  UndoIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state-message";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Markdown from "@/components/ui/markdown";
import EditMarkdownSheet from "@/components/sheets/edit-markdown-sheet";
import { ChooseChapterSheet } from "@/components/sheets/choose-chapter-sheet";
import { AiStatusBadge } from "@/components/ai-requests/status-badge";
import { useAiRequest } from "@/hooks/useAiRequests";
import { api } from "@/lib/api";
import { apiErrorMsg, cn, withConfirmation } from "@/lib/utils";
import type { TAiDraft, TDraftStatus } from "@/models/AiRequest";

type Tab = "pending" | "approved" | "rejected";
const TABS: [Tab, string][] = [
  ["pending", "To review"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
];

const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "");

type CardProps = {
  draft: TAiDraft;
  n: number;
  busy: boolean;
  onStatus: (status: TDraftStatus) => void;
  onEdit: (field: "text" | "ans") => void;
};

// One draft, laid out like a question in the bank: number, type, the question,
// and the answer folded away. Approve / Reject are the only big buttons.
const DraftCard = memo(function DraftCard({ draft, n, busy, onStatus, onEdit }: CardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  return (
    <li className="defer-offscreen overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 px-4 pt-3">
        <span className="text-sm font-bold">Q{n}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {draft.questionType === "NUMERICAL" ? "Numerical" : "MCQ"}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700" title="Solved again independently: the answer matches">
          <BadgeCheckIcon className="size-3.5" aria-hidden="true" /> Answer checked
        </span>
        <Button variant="ghost" size="icon" className="ml-auto size-9" aria-label={`Edit question ${n}`} onClick={() => onEdit("text")}>
          <PencilIcon className="size-4" />
        </Button>
      </div>
      <div className="overflow-x-auto px-2 pb-1 text-[15px]">
        <Markdown text={draft.text} />
      </div>
      <div className="border-t">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setShowAnswer((v) => !v)}
            aria-expanded={showAnswer}
            className="flex h-11 flex-1 items-center gap-1.5 px-4 text-sm font-medium text-brand"
          >
            <ChevronDownIcon className={cn("size-4 transition-transform", showAnswer && "rotate-180")} aria-hidden="true" />
            Answer & explanation
          </button>
          {showAnswer && (
            <Button variant="ghost" size="icon" className="mr-2 size-9" aria-label={`Edit answer ${n}`} onClick={() => onEdit("ans")}>
              <PencilIcon className="size-4" />
            </Button>
          )}
        </div>
        {showAnswer && (
          <div className="overflow-x-auto bg-muted/40 px-2 pb-2">
            <Markdown text={draft.ans} />
          </div>
        )}
      </div>
      <div className="flex gap-2 border-t p-3">
        {draft.status === "pending" ? (
          <>
            <Button variant="outline" disabled={busy} className="h-11 flex-1 gap-1.5 text-red-700" onClick={() => onStatus("rejected")}>
              <XIcon className="size-4" /> Reject
            </Button>
            <Button variant="brand" disabled={busy} className="h-11 flex-1 gap-1.5" onClick={() => onStatus("approved")}>
              <CheckIcon className="size-4" /> Approve
            </Button>
          </>
        ) : (
          <Button variant="outline" disabled={busy} className="h-11 flex-1 gap-1.5" onClick={() => onStatus("pending")}>
            <UndoIcon className="size-4" /> Move back to review
          </Button>
        )}
      </div>
    </li>
  );
});

// Pattern 2 - Detail / Record: one request. Status + metadata in the header,
// the drafts as the body with To review / Approved / Rejected tabs, and one
// primary action: add the approved questions to the chapter.
export default function AiRequestPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { request, loading, gone, error, refresh } = useAiRequest(params.id);
  const [tab, setTab] = useState<Tab>("pending");
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<{ draft: TAiDraft; field: "text" | "ans" } | null>(null);

  const drafts = request?.drafts ?? [];
  const count = (s: TDraftStatus) => drafts.filter((d) => d.status === s).length;
  const shown = drafts.filter((d) => d.status === tab);
  const approved = count("approved");
  // Upload opens a chapter picker (pre-set to the request's chapter); the upload happens there
  const [picking, setPicking] = useState(false);
  const chapter = request?.target.chapter?.title ?? "the chapter";

  const setStatus = async (ids: string[], status: TDraftStatus) => {
    setBusyIds((b) => [...b, ...ids]);
    try {
      await api.patch(`ai-requests/${params.id}/drafts`, { draftIds: ids, status });
      await refresh();
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't save"));
    } finally {
      setBusyIds((b) => b.filter((id) => !ids.includes(id)));
    }
  };

  const saveEdit = async (value: string) => {
    if (!editing) return;
    try {
      await api.patch(`ai-requests/${params.id}/drafts`, { draftId: editing.draft._id, [editing.field]: value });
      toast.success("Saved");
      setEditing(null);
      refresh();
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't save"));
    }
  };

  const upload = async (chapterId: string) => {
    setUploading(true);
    try {
      const res = (await api.post(`ai-requests/${params.id}/upload`, { chapterId }))?.data?.data;
      const n = res?.uploaded ?? approved;
      toast.success(`${n} question${n === 1 ? "" : "s"} uploaded`);
      setPicking(false);
      if (res?.removed) router.replace("/ai-requests");
      else refresh();
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't upload the questions"));
    } finally {
      setUploading(false);
    }
  };

  const remove = () =>
    withConfirmation(
      async () => {
        try {
          await api.delete(`ai-requests/${params.id}`);
          toast.success("Request deleted");
          router.replace("/ai-requests");
        } catch (err) {
          toast.error(apiErrorMsg(err, "Couldn't delete"));
        }
      },
      { title: "Delete this request?", description: "Its drafts are deleted too. Questions already added to the bank stay.", confirmText: "Delete request" }
    );

  const cancel = async () => {
    try {
      await api.patch(`ai-requests/${params.id}`, { action: "cancel" });
      toast.success("Cancelled");
      refresh();
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't cancel"));
    }
  };

  const back = (
    <Link href="/ai-requests" className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
      <ArrowLeftIcon className="size-4" aria-hidden="true" /> AI requests
    </Link>
  );

  if (gone)
    return (
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-12 pt-4 sm:px-6">
        {back}
        <EmptyState className="rounded-2xl border bg-card py-12" icon={<CheckIcon />} title="All done" description="This request was finished and removed. Its approved questions are in the bank." />
      </main>
    );

  return (
    <main className={cn("mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 sm:px-6", approved > 0 ? "pb-28" : "pb-12")}>
      {back}
      {error ? (
        <ErrorState message={error} onRetry={refresh} className="rounded-2xl border bg-card py-12" />
      ) : loading || !request ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading request">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : (
        <>
          <header className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">{request.title}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <AiStatusBadge status={request.status} />
                <span className="truncate">
                  {request.target.book?.title} › {chapter}
                </span>
                <span>· {day(request.createdAt)}</span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger aria-label="More actions" className={cn(buttonVariants({ variant: "ghost" }), "size-10 shrink-0 p-0")}>
                <EllipsisVerticalIcon className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl p-1.5">
                <DropdownMenuItem className="h-10 cursor-pointer gap-2.5 rounded-lg text-red-700 focus:text-red-700" disabled={request.status === "running"} onSelect={remove}>
                  <TrashIcon className="size-4" /> Delete request
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {request.status === "queued" && (
            <section className="flex items-start gap-3 rounded-2xl border bg-card p-4">
              <MoonStarIcon className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">Claude will work on this tonight.</p>
                <p className="text-muted-foreground">
                  {request.expected} question{request.expected === 1 ? "" : "s"}. Each one is solved again independently before you see it.
                </p>
              </div>
              <Button variant="outline" className="h-10 shrink-0" onClick={cancel}>
                Cancel
              </Button>
            </section>
          )}

          {request.status === "running" && (
            <section className="rounded-2xl border bg-card p-4 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <Loader2Icon className="size-4 animate-spin text-brand" aria-hidden="true" /> Generating: {drafts.length} of {request.expected}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={request.expected} aria-valuenow={drafts.length}>
                <div className="h-full bg-brand transition-[width]" style={{ width: `${Math.min(100, (drafts.length / Math.max(1, request.expected)) * 100)}%` }} />
              </div>
            </section>
          )}

          {(request.status === "failed" || request.status === "cancelled") && !drafts.length && (
            <ErrorState
              className="rounded-2xl border bg-card py-10"
              message={request.status === "cancelled" ? "This request was cancelled." : request.error || "Claude couldn't make any questions that passed the checks."}
            />
          )}

          {drafts.length > 0 && (
            <>
              <div role="tablist" aria-label="Drafts" className="grid grid-cols-3 rounded-xl border bg-muted p-0.5">
                {TABS.map(([value, label]) => (
                  <button
                    key={value}
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => setTab(value)}
                    className={cn("h-10 rounded-lg text-sm font-medium", tab === value ? "bg-background shadow-sm" : "text-muted-foreground")}
                  >
                    {label} <span className="tabular-nums text-muted-foreground">{count(value)}</span>
                  </button>
                ))}
              </div>

              {tab === "pending" && count("pending") > 1 && (
                <div className="flex justify-end">
                  <Button variant="ghost" className="h-10 gap-1.5 text-brand" onClick={() => setStatus(shown.map((d) => d._id), "approved")}>
                    <CheckIcon className="size-4" /> Approve all {count("pending")}
                  </Button>
                </div>
              )}

              {shown.length ? (
                <ol className="space-y-3">
                  {shown.map((d) => (
                    <DraftCard
                      key={d._id}
                      draft={d}
                      n={drafts.indexOf(d) + 1}
                      busy={busyIds.includes(d._id)}
                      onStatus={(s) => setStatus([d._id], s)}
                      onEdit={(field) => setEditing({ draft: d, field })}
                    />
                  ))}
                </ol>
              ) : (
                <EmptyState
                  className="rounded-2xl border bg-card py-10"
                  icon={<CheckIcon />}
                  title={tab === "pending" ? "Nothing left to review" : tab === "approved" ? "Nothing approved yet" : "Nothing rejected"}
                  description={tab === "pending" && approved > 0 ? `Upload the ${approved} approved question${approved === 1 ? "" : "s"}.` : undefined}
                />
              )}
            </>
          )}
        </>
      )}

      {/* The one primary action, always within reach on a phone */}
      {request && approved > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <p className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground sm:block">{approved} approved</p>
            <Button variant="brand" className="h-11 flex-1 gap-2 sm:flex-none" disabled={uploading || request.status === "running"} onClick={() => setPicking(true)}>
              <UploadIcon className="size-4" />
              Upload questions
            </Button>
          </div>
        </div>
      )}

      <ChooseChapterSheet
        open={picking}
        onOpenChange={(o) => !uploading && setPicking(o)}
        title="Upload questions"
        description="Choose where the approved questions go."
        initial={{
          course: request?.target.chapter?.course,
          subject: request?.target.chapter?.subject,
          bookId: request?.target.book?._id,
          chapterId: request?.target.chapter?._id,
        }}
        confirmLabel={`Upload ${approved} question${approved === 1 ? "" : "s"}`}
        onConfirm={upload}
      />

      {editing && (
        <EditMarkdownSheet
          open
          onOpenChange={(o) => !o && setEditing(null)}
          title={editing.field === "text" ? "Edit question" : "Edit answer & explanation"}
          text={editing.field === "text" ? editing.draft.text : editing.draft.ans}
          onSave={saveEdit}
        />
      )}
    </main>
  );
}
