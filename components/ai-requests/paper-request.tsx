"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CheckIcon, EllipsisVerticalIcon, FileTextIcon, Loader2Icon, MoonStarIcon, PencilIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/state-message";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AiStatusBadge } from "@/components/ai-requests/status-badge";
import { NewAiRequestSheet } from "@/components/sheets/new-ai-request-sheet";
import PreviewButton from "@/components/ui/preview-button-v2";
import { PaperNote } from "@/components/ai-requests/paper-note";
import { fetchPapers, postUpdateUsage } from "@/service/core.service";
import type { TAiRequestDetail, TDraftChapter, TMadePaper } from "@/hooks/useAiRequests";
import { WrittenPaper } from "@/components/ai-requests/written-paper";
import type { TPaperInput } from "@/models/AiRequest";
import { api } from "@/lib/api";
import { apiErrorMsg, cn, withConfirmation } from "@/lib/utils";

type Props = { id: string; request: TAiRequestDetail; madePaper: TMadePaper | null; chapters: TDraftChapter[]; refresh: () => void };

// "paper" requests: the prompt while queued, then the Draft paper Claude made
// from the bank, to open in Create Paper (or discard).
export function PaperRequest({ id, request, madePaper, chapters, refresh }: Props) {
  const router = useRouter();
  const input = request.input as unknown as TPaperInput;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const result = request.result;

  const close = async (discardPaper: boolean) => {
    setBusy(true);
    try {
      await api.delete(`ai-requests/${id}${discardPaper ? "?discardPaper=1" : ""}`);
      toast.success(discardPaper ? "Paper discarded" : "Done. The paper stays in Papers.");
      router.replace("/ai-requests");
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't do that"));
      setBusy(false);
    }
  };

  // Draft → saved paper (Public, so it shows in Papers), then the request closes
  const save = async () => {
    setBusy(true);
    try {
      await api.post(`ai-requests/${id}/save-paper`);
      toast.success("Paper saved. It's in Papers now.");
      router.replace("/papers");
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't save the paper"));
      setBusy(false);
    }
  };

  const discard = () =>
    withConfirmation(() => close(true), {
      title: "Discard this paper?",
      description: "The draft paper Claude made is deleted. The questions stay in the bank.",
      confirmText: "Discard",
    });

  const cancel = async () => {
    try {
      await api.patch(`ai-requests/${id}`, { action: "cancel" });
      toast.success("Cancelled");
      refresh();
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't cancel"));
    }
  };

  const rows: [string, string][] = [
    ["Questions from", input.source === "write" ? "Write new" : "Question bank"],
    ["Course", input.course],
    ["Subjects", (input.subjects ?? []).join(", ")],
    ["Prompt", input.prompt],
  ];

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-12 pt-4 sm:px-6">
      <Link href="/ai-requests" className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden="true" /> AI requests
      </Link>

      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-xl font-bold leading-tight tracking-tight sm:text-2xl">{input.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <AiStatusBadge status={request.status} />
            <span>
              Paper · {input.course} · {(input.subjects ?? []).join(", ")}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="More actions" className={cn(buttonVariants({ variant: "ghost" }), "size-10 shrink-0 p-0")}>
            <EllipsisVerticalIcon className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl p-1.5">
            <DropdownMenuItem
              className="h-10 cursor-pointer gap-2.5 rounded-lg text-red-700 focus:text-red-700"
              disabled={request.status === "running"}
              onSelect={() =>
                withConfirmation(() => close(!!result?.paper), {
                  title: "Delete this request?",
                  description: result?.paper ? "The draft paper it made is deleted too (unless it was already published)." : "Nothing has been made yet.",
                  confirmText: "Delete",
                })
              }
            >
              <TrashIcon className="size-4" /> Delete request
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {request.status === "review" && !result?.paper && request.drafts?.length > 0 && (
        <WrittenPaper id={id} request={request} chapters={chapters} onDiscard={() => close(false)} />
      )}

      {request.status === "review" && result?.paper && (
        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand" aria-hidden="true">
              <FileTextIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{madePaper?.title ?? input.name}</p>
              <p className="text-sm text-muted-foreground">
                {result.questions ?? madePaper?.questions ?? 0} questions · {result.marks ?? "?"} marks · draft until you save it
              </p>
            </div>
          </div>
          {result.note && <PaperNote note={result.note} />}
          {!madePaper && <p className="text-sm text-red-700">The paper was deleted from Papers.</p>}
          {/* Happy with it: save. Want to look or change first: view / edit. */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            {madePaper && (
              <Button variant="brand" className="col-span-2 h-11 gap-2 sm:col-auto" disabled={busy} onClick={save}>
                {busy ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />} Save paper
              </Button>
            )}
            {madePaper && (
              <PreviewButton
                paperId={madePaper._id}
                questions={[]}
                defaultTwoColumn
                variant="outline"
                className="h-11 w-full sm:w-auto"
                // Printing counts as using the questions, as on the Papers page
                // (make-paper prefers the least-used ones)
                onPrint={() =>
                  fetchPapers(madePaper._id)
                    .then((d) => d.papers[0]?.questions && postUpdateUsage(d.papers[0].questions))
                    .catch(() => undefined)
                }
              />
            )}
            {madePaper && (
              <Link href={`/papers/edit/${madePaper._id}`} className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full gap-2 sm:w-auto")}>
                <PencilIcon className="size-4" /> Edit
              </Link>
            )}
            <Button variant="ghost" className="col-span-2 h-11 text-red-700 hover:bg-red-50 hover:text-red-800 sm:ml-auto" disabled={busy || !madePaper} onClick={discard}>
              Discard
            </Button>
          </div>
        </section>
      )}

      {request.status === "queued" && (
        <section className="flex items-start gap-3 rounded-2xl border bg-card p-4">
          <MoonStarIcon className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">Claude will make this paper tonight.</p>
            <p className="text-muted-foreground">
              {input.source === "write"
                ? "It writes every question, checks each answer independently, and keeps them here until you save the paper."
                : "It picks questions from the bank, least used first, and saves a draft paper for you."}
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
            <Loader2Icon className="size-4 animate-spin text-brand" aria-hidden="true" /> Making the paper…
            {request.drafts?.length > 0 && <span className="font-normal text-muted-foreground">{request.drafts.length} questions written so far</span>}
          </p>
        </section>
      )}

      {(request.status === "failed" || request.status === "cancelled") && (
        <ErrorState className="rounded-2xl border bg-card py-10" message={request.status === "cancelled" ? "This request was cancelled." : request.error || "Claude couldn't make this paper."} />
      )}

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Request details</h2>
        <dl className="grid gap-x-4 gap-y-2.5 text-sm sm:grid-cols-[8rem_1fr]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="-mt-2 whitespace-pre-wrap break-words sm:mt-0">{v}</dd>
            </div>
          ))}
        </dl>
        {request.status === "queued" && (
          <Button variant="outline" className="mt-4 h-10 gap-2" onClick={() => setEditing(true)}>
            <PencilIcon className="size-4" /> Edit request
          </Button>
        )}
      </section>

      {request.status === "queued" && (
        <NewAiRequestSheet open={editing} onOpenChange={setEditing} editing={{ id, type: "paper", input: input as unknown as Record<string, unknown> }} onSaved={refresh} />
      )}
    </main>
  );
}
