"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  BugIcon,
  CheckIcon,
  HeartIcon,
  EllipsisVerticalIcon,
  ImageOffIcon,
  InboxIcon,
  LightbulbIcon,
  MessageCircleQuestionIcon,
  RotateCcwIcon,
  SendIcon,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { LIST_SWR, swrError } from "@/lib/swr";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/state-message";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TSuggestion, TSuggestionType } from "@/models/Suggestion";

const TYPE_META: Record<TSuggestionType, { label: string; Icon: typeof BugIcon; tone: string }> = {
  bug: { label: "Bug", Icon: BugIcon, tone: "bg-red-100 text-red-700" },
  idea: { label: "Idea", Icon: LightbulbIcon, tone: "bg-amber-100 text-amber-800" },
  question: { label: "Question", Icon: MessageCircleQuestionIcon, tone: "bg-sky-100 text-sky-700" },
  appreciate: { label: "Appreciate", Icon: HeartIcon, tone: "bg-emerald-100 text-emerald-700" },
};

const STATUS_TABS = [
  { value: "new", label: "New" },
  { value: "done", label: "Done" },
  { value: "", label: "All" },
];

type TInbox = { items: TSuggestion[]; total: number; newCount: number; totalPages: number };

const when = (value: string) =>
  new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function SuggestionCard({ s }: { s: TSuggestion }) {
  const meta = TYPE_META[s.type];
  const [draft, setDraft] = useState(s.reply?.text ?? "");
  const [editing, setEditing] = useState(!s.reply?.text);
  const [saving, setSaving] = useState(false);

  // Writes refresh the inbox through invalidateAfterWrite ("dev-suggestions").
  const update = async (body: { reply?: string; status?: "new" | "done" }, done: string) => {
    setSaving(true);
    try {
      await api.patch("dev-suggestions", { id: s._id, ...body });
      toast.success(done);
      if (body.reply !== undefined) setEditing(false);
    } catch (err) {
      toast.error((err as Error)?.message || "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {meta && (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", meta.tone)}>
            <meta.Icon className="size-3.5" aria-hidden="true" />
            {meta.label}
          </span>
        )}
        <span className="font-semibold">{s.name || "Student"}</span>
        <span className="text-xs text-muted-foreground">{when(s.createdAt)}</span>
        {s.status === "new" && <span className="size-2 rounded-full bg-brand" aria-label="New" />}
      </div>

      <p className="mt-2 whitespace-pre-wrap break-words">{s.message}</p>

      {s.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {s.images.map((img, i) => (
            <a key={img.publicId} href={img.url} target="_blank" rel="noreferrer" aria-label={`Open image ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="size-24 rounded-lg border object-cover hover:opacity-90" />
            </a>
          ))}
        </div>
      )}

      {s.context?.ua && (
        <p className="mt-2 break-all text-xs text-muted-foreground">
          {s.context.screen && `${s.context.screen} · `}
          {s.context.ua}
        </p>
      )}

      <div className="mt-3 border-t pt-3">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a reply. The student sees it in their app."
              aria-label="Reply"
              rows={3}
              maxLength={2000}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="brand" size="sm" disabled={saving || !draft.trim()} onClick={() => update({ reply: draft }, "Reply sent")}>
                <SendIcon className="size-4" aria-hidden="true" /> Send reply
              </Button>
              {s.reply?.text && (
                <Button variant="ghost" size="sm" onClick={() => { setDraft(s.reply?.text ?? ""); setEditing(false); }}>
                  Cancel
                </Button>
              )}
              <StatusButton s={s} saving={saving} onUpdate={update} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg bg-brand-soft p-3 text-sm">
              <p className="text-xs font-semibold text-brand">
                Your reply · {s.reply?.at && when(s.reply.at)} · {s.replySeen ? "Seen" : "Not seen yet"}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words">{s.reply?.text}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit reply
              </Button>
              <StatusButton s={s} saving={saving} onUpdate={update} />
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function StatusButton({
  s,
  saving,
  onUpdate,
}: {
  s: TSuggestion;
  saving: boolean;
  onUpdate: (body: { status: "new" | "done" }, done: string) => void;
}) {
  return s.status === "new" ? (
    <Button variant="outline" size="sm" disabled={saving} onClick={() => onUpdate({ status: "done" }, "Marked done")}>
      <CheckIcon className="size-4" aria-hidden="true" /> Mark done
    </Button>
  ) : (
    <Button variant="ghost" size="sm" disabled={saving} onClick={() => onUpdate({ status: "new" }, "Moved back to New")}>
      <RotateCcwIcon className="size-4" aria-hidden="true" /> Mark new
    </Button>
  );
}

export default function SuggestionsInbox() {
  const [status, setStatus] = useState("new");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [clearing, setClearing] = useState(false);

  const key = ["dev-suggestions", status, type, page] as const;
  const { data, error, isLoading, mutate } = useSWR(
    key,
    async () =>
      (await api.get("dev-suggestions", { params: { status: status || undefined, type: type || undefined, page } }))?.data
        ?.data as TInbox,
    { ...LIST_SWR, keepPreviousData: true }
  );

  const clearImages = async () => {
    if (!window.confirm("Delete every image students attached, from Cloudinary? The messages stay.")) return;
    setClearing(true);
    try {
      const res = (await api.post("dev-suggestions"))?.data?.data;
      toast.success(`Cleared ${res?.cleared ?? 0} images`);
    } catch (err) {
      toast.error((err as Error)?.message || "Couldn't clear images");
    } finally {
      setClearing(false);
    }
  };

  const items = data?.items ?? [];

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl space-y-4 px-4 pb-12 pt-5 sm:px-6">
      <PageHeader
        icon={<InboxIcon />}
        title="Suggestions"
        description={data ? `${data.newCount} new from students` : "From the Suggestion box in the student app"}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions" disabled={clearing}>
                <EllipsisVerticalIcon className="size-5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={clearImages} className="gap-2 text-destructive focus:text-destructive">
                <ImageOffIcon className="size-4" aria-hidden="true" /> Clear images
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* The student app's four tiles; tap the selected one again for all types. */}
      <div role="radiogroup" aria-label="Type" className="grid grid-cols-4 gap-2">
        {(Object.entries(TYPE_META) as [TSuggestionType, (typeof TYPE_META)[TSuggestionType]][]).map(([value, m]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            onClick={() => { setType(type === value ? "" : value); setPage(1); }}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-semibold transition-colors",
              type === value ? "border-brand bg-brand-soft text-brand" : "bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            <m.Icon className="size-5" aria-hidden="true" />
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Status" className="flex rounded-lg border bg-muted p-0.5">
          {STATUS_TABS.map((t) => (
            <button
              key={t.label}
              role="tab"
              aria-selected={status === t.value}
              onClick={() => { setStatus(t.value); setPage(1); }}
              className={cn(
                "h-9 rounded-md px-4 text-sm font-medium",
                status === t.value ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

      </div>

      {error ? (
        <ErrorState message={swrError(error, "Couldn't load suggestions")} onRetry={() => mutate()} />
      ) : isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<InboxIcon />} title="Nothing here" description={status === "new" ? "No new messages." : "No messages match."} />
      ) : (
        <ul className="space-y-3">
          {items.map((s) => <SuggestionCard key={`${s._id}-${s.reply?.at ?? ""}-${s.status}`} s={s} />)}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-muted-foreground">Page {page} of {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

    </main>
  );
}
