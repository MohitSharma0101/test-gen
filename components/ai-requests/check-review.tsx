"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ChevronRightIcon, EllipsisVerticalIcon, FlagIcon, Loader2Icon, MoonStarIcon, SendIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import { ErrorState } from "@/components/ui/state-message";
import SelectCompact from "@/components/ui/select-compact";
import Markdown from "@/components/ui/markdown";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AiStatusBadge } from "@/components/ai-requests/status-badge";
import { NewAiRequestSheet } from "@/components/sheets/new-ai-request-sheet";
import type { TAiRequestDetail, TCheckContext, TCheckPaperQuestion } from "@/hooks/useAiRequests";
import type { TCheckInput, TCheckedAnswerDraft, TCheckedSheet } from "@/models/AiRequest";
import { MISTAKE_TYPES } from "@/data/const";
import { api } from "@/lib/api";
import { apiErrorMsg, cn, withConfirmation } from "@/lib/utils";

const MISTAKE_LABEL: Record<(typeof MISTAKE_TYPES)[number], string> = {
  concept: "Concept not clear",
  method: "Wrong method",
  calculation: "Calculation slip",
  incomplete: "Left incomplete",
  misread: "Misread the question",
  not_attempted: "Not attempted",
};
const MISTAKE_OPTIONS = MISTAKE_TYPES.map((v) => ({ label: MISTAKE_LABEL[v], value: v }));

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ""));
const sum = (answers: TCheckedAnswerDraft[]) => answers.reduce((t, a) => t + (Number(a.marks) || 0), 0);

type Props = { id: string; request: TAiRequestDetail; check: TCheckContext; refresh: () => void };

/** One question of one student's sheet: what they wrote, marks, mistake, note. Saves on change / blur. */
function AnswerRow({ n, q, a, sheetId, requestId, pages, onSaved }: {
  n: number;
  q: TCheckPaperQuestion;
  a: TCheckedAnswerDraft;
  sheetId: string;
  requestId: string;
  pages: string[];
  onSaved: () => void;
}) {
  const max = Number(q.mark) || 1;
  const [marks, setMarks] = useState(fmt(a.marks));
  const [note, setNote] = useState(a.note ?? "");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async (change: Record<string, unknown>) => {
    setSaving(true);
    try {
      await api.patch(`ai-requests/${requestId}/checked`, { sheetId, question: q._id, ...change });
      onSaved();
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className={cn("space-y-2 rounded-xl border bg-card p-3", a.flagged && "border-amber-400 bg-amber-50/60")}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            Q{n}
            {a.flagged && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                <FlagIcon className="size-3" aria-hidden="true" /> Check this
              </span>
            )}
            {saving && <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" aria-label="Saving" />}
          </p>
          {q.chapter?.title && <p className="truncate text-xs text-muted-foreground">{q.chapter.title}</p>}
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-sm">
          <input
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            onBlur={() => {
              const v = Number(marks);
              if (marks.trim() === "" || !Number.isFinite(v)) return setMarks(fmt(a.marks));
              if (v !== a.marks) save({ marks: v });
            }}
            inputMode="decimal"
            aria-label={`Marks for question ${n}, out of ${max}`}
            className="h-11 w-16 rounded-lg border bg-background text-center tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          <span className="text-muted-foreground">/ {max}</span>
        </label>
      </div>

      <p className="text-sm">
        <span className="text-muted-foreground">Wrote: </span>
        {a.answer || "—"}
        {typeof a.page === "number" && pages[a.page] && (
          <a href={pages[a.page]} target="_blank" rel="noreferrer" className="ml-2 text-xs font-medium text-brand underline-offset-2 hover:underline">
            Page {a.page + 1}
          </a>
        )}
      </p>

      <div className="grid gap-2 sm:grid-cols-[14rem_1fr]">
        <SelectCompact
          label="Mistake"
          placeholder="None"
          canUnselect
          options={MISTAKE_OPTIONS}
          value={a.mistakeType}
          onChange={(v) => save({ mistakeType: v || "" })}
        />
        <div className="space-y-1">
          <label htmlFor={`note-${sheetId}-${q._id}`} className="ml-1 text-xs font-medium">
            Note for the student
          </label>
          <Textarea
            id={`note-${sheetId}-${q._id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (a.note ?? "") && save({ note })}
            rows={2}
            maxLength={600}
          />
        </div>
      </div>

      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="h-9 text-xs font-medium text-brand">
        {open ? "Hide question and solution" : "Show question and solution"}
      </button>
      {open && (
        <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
          <Markdown text={q.text ?? ""} />
          <div className="border-t pt-2">
            <Markdown text={q.ans ?? ""} />
          </div>
        </div>
      )}
    </li>
  );
}

// "check" requests: the marked answer sheets, reviewed per student, then
// published as one Exam Result.
export function CheckReview({ id, request, check, refresh }: Props) {
  const router = useRouter();
  const input = request.input as unknown as TCheckInput;
  const sheets = useMemo(() => request.checked ?? [], [request.checked]);
  const questions = check.paper?.questions ?? [];
  const maxTotal = questions.reduce((t, q) => t + (Number(q.mark) || 1), 0);
  const names = useMemo(() => new Map(check.students.map((s) => [String(s._id), s.name])), [check.students]);
  const pagesOf = useMemo(() => new Map(input.sheets.map((s) => [String(s.student), s.pages])), [input.sheets]);
  const [openSheet, setOpenSheet] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [retyping, setRetyping] = useState(false);

  const flaggedIn = (s: TCheckedSheet) => s.answers.filter((a) => a.flagged).length;
  const rows = [...sheets].sort((a, b) => flaggedIn(b) - flaggedIn(a) || (names.get(String(a.student)) ?? "").localeCompare(names.get(String(b.student)) ?? ""));
  const totalFlags = sheets.reduce((t, s) => t + flaggedIn(s), 0);
  const avg = sheets.length ? sheets.reduce((t, s) => t + sum(s.answers), 0) / sheets.length : 0;
  const current = sheets.find((s) => String(s._id) === openSheet);

  const remove = () =>
    withConfirmation(
      async () => {
        try {
          await api.delete(`ai-requests/${id}`);
          toast.success("Deleted");
          router.replace("/ai-requests");
        } catch (err) {
          toast.error(apiErrorMsg(err, "Couldn't delete"));
        }
      },
      { title: "Delete this check?", description: "The answer-sheet pages and any marking are deleted. Nothing is published.", confirmText: "Delete" }
    );

  const publish = () =>
    withConfirmation(
      async () => {
        setPublishing(true);
        try {
          await api.post(`ai-requests/${id}/publish`);
          toast.success(`Results published for ${sheets.length} student${sheets.length === 1 ? "" : "s"}`);
          router.replace("/exam-results");
        } catch (err) {
          toast.error(apiErrorMsg(err, "Couldn't publish"));
          setPublishing(false);
        }
      },
      {
        title: "Publish these results?",
        description: `${sheets.length} student${sheets.length === 1 ? "" : "s"} get marks in Exam Results.${totalFlags ? ` ${totalFlags} answer${totalFlags === 1 ? " is" : "s are"} still flagged.` : ""} The answer-sheet pages are then deleted.`,
        confirmText: "Publish",
      }
    );

  const cancel = async () => {
    try {
      await api.patch(`ai-requests/${id}`, { action: "cancel" });
      toast.success("Cancelled");
      refresh();
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't cancel"));
    }
  };

  return (
    <main className={cn("mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 sm:px-6", request.status === "review" ? "pb-28" : "pb-12")}>
      <Link href="/ai-requests" className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden="true" /> AI requests
      </Link>

      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-xl font-bold leading-tight tracking-tight sm:text-2xl">{input.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <AiStatusBadge status={request.status} />
            <span>{check.batch?.name}</span>
            <span>· {input.subject}</span>
            <span>· {new Date(input.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="More actions" className={cn(buttonVariants({ variant: "ghost" }), "size-10 shrink-0 p-0")}>
            <EllipsisVerticalIcon className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl p-1.5">
            <DropdownMenuItem className="h-10 cursor-pointer gap-2.5 rounded-lg text-red-700 focus:text-red-700" disabled={request.status === "running"} onSelect={remove}>
              <TrashIcon className="size-4" /> Delete check
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {request.status === "queued" && (
        <section className="flex items-start gap-3 rounded-2xl border bg-card p-4">
          <MoonStarIcon className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">Claude will check these tonight.</p>
            <p className="text-muted-foreground">
              {input.sheets.length} answer sheet{input.sheets.length === 1 ? "" : "s"} against {check.paper?.title ?? "the paper"}. Every answer is read twice; doubtful ones are flagged for you.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="h-10" onClick={() => setRetyping(true)}>
              Change type
            </Button>
            <Button variant="outline" className="h-10" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </section>
      )}
      {request.status === "queued" && (
        <NewAiRequestSheet
          open={retyping}
          onOpenChange={setRetyping}
          editing={{ id, type: "check", input: { name: input.name, instructions: input.instructions, subject: input.subject } }}
          onSaved={refresh}
        />
      )}

      {request.status === "running" && (
        <section className="rounded-2xl border bg-card p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Loader2Icon className="size-4 animate-spin text-brand" aria-hidden="true" /> Checking: {sheets.length} of {input.sheets.length}
          </p>
        </section>
      )}

      {(request.status === "failed" || request.status === "cancelled") && !sheets.length && (
        <ErrorState className="rounded-2xl border bg-card py-10" message={request.status === "cancelled" ? "This check was cancelled." : request.error || "Claude couldn't check these answer sheets."} />
      )}

      {sheets.length > 0 && (
        <>
          <section className="grid grid-cols-3 gap-2">
            {[
              ["Checked", `${sheets.length} / ${input.sheets.length}`],
              ["To look at", String(totalFlags)],
              ["Average", `${fmt(Math.round(avg * 10) / 10)} / ${maxTotal}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl border bg-card p-3">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">{v}</p>
              </div>
            ))}
          </section>

          {!!request.rubric?.length && (
            <details className="group rounded-2xl border bg-card">
              <summary className="flex h-12 cursor-pointer list-none items-center px-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                Marking scheme used for every student
              </summary>
              <ol className="space-y-2 border-t px-4 pb-4 pt-3 text-sm">
                {request.rubric.map((r) => {
                  const i = questions.findIndex((q) => String(q._id) === String(r.question));
                  return (
                    <li key={String(r.question)} className="whitespace-pre-wrap">
                      <span className="font-semibold">Q{i + 1}. </span>
                      {r.points}
                    </li>
                  );
                })}
              </ol>
            </details>
          )}

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Students</h2>
            <ul className="divide-y rounded-2xl border bg-card">
              {rows.map((s) => {
                const flags = flaggedIn(s);
                return (
                  <li key={String(s._id)}>
                    <button type="button" onClick={() => setOpenSheet(String(s._id))} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-muted/60">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{names.get(String(s.student)) ?? "Student"}</span>
                        {flags > 0 && <span className="block text-xs text-amber-800">{flags} to look at</span>}
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {fmt(sum(s.answers))} / {maxTotal}
                      </span>
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <ResponsiveDrawer
        open={!!current}
        onOpenChange={(o) => !o && setOpenSheet(null)}
        size="lg"
        title={current ? names.get(String(current.student)) ?? "Student" : ""}
        description={current ? `${fmt(sum(current.answers))} / ${maxTotal} marks` : undefined}
      >
        {current && (
          <div className="space-y-3 p-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(pagesOf.get(String(current.student)) ?? []).map((url, i) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Page ${i + 1}`} className="h-28 w-20 rounded-lg object-cover" loading="lazy" />
                </a>
              ))}
            </div>
            <ol className="space-y-2">
              {questions.map((q, i) => {
                const a = current.answers.find((x) => String(x.question) === String(q._id));
                return a ? (
                  <AnswerRow
                    key={`${current._id}-${q._id}`}
                    n={i + 1}
                    q={q}
                    a={a}
                    sheetId={String(current._id)}
                    requestId={id}
                    pages={pagesOf.get(String(current.student)) ?? []}
                    onSaved={refresh}
                  />
                ) : null;
              })}
            </ol>
          </div>
        )}
      </ResponsiveDrawer>

      {request.status === "review" && sheets.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <p className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground sm:block">
              {totalFlags ? `${totalFlags} answer${totalFlags === 1 ? "" : "s"} to look at` : "All answers looked at"}
            </p>
            <Button variant="brand" className="h-11 flex-1 gap-2 sm:flex-none" disabled={publishing} onClick={publish}>
              {publishing ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
              Publish results
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
