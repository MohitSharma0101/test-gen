"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangleIcon, Loader2Icon, PenLineIcon, RefreshCwIcon, SparklesIcon, UsersIcon, WandSparklesIcon } from "lucide-react";
import EditMarkdownSheet from "@/components/sheets/edit-markdown-sheet";
import { DifficultyBadge } from "@/components/question-bank/difficulty-badge";
import { Button } from "@/components/ui/button";
import { DocumentWindow } from "@/components/ui/document-window";
import Markdown from "@/components/ui/markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state-message";
import { useAuth } from "@/context/auth-context";
import { Role } from "@/data/const";
import { useBatchInsights, type TBatchInsights, type TInsightQuestion } from "@/hooks/useInsights";
import { api } from "@/lib/api";
import { writePracticePrefill } from "@/lib/practicePrefill";
import { cn } from "@/lib/utils";
import { sendToVariants } from "@/lib/variantHandoff";
import { putUpdateQuestion } from "@/service/core.service";
import { AccuracyBar, accuracyText, pctOf } from "./accuracy-bar";

type Props = { open: boolean; onOpenChange: (o: boolean) => void; batchId: string; batchName: string };

const label = "text-xs font-bold uppercase tracking-wider text-muted-foreground";
const SHOW = 8;

// A batch's online tests, read for planning: what to re-teach, which
// students need it, and which questions are hardest or look wrong (with
// Generate variant / Fix answer right there).
export const BatchInsightsWindow = ({ open, onOpenChange, batchId, batchName }: Props) => {
  const { insights: d, loading, error, refresh } = useBatchInsights(open ? batchId : undefined);
  const { account } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const refreshStats = async () => {
    setRefreshing(true);
    try {
      const res = await api.post("question-stats");
      toast.success(`Difficulty updated for ${res?.data?.data?.questions ?? 0} questions`);
      refresh();
    } catch (err) {
      toast.error((err as Error)?.message || "Couldn't refresh");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <DocumentWindow
      open={open}
      onOpenChange={onOpenChange}
      title={`${batchName} · insights`}
      description={d ? `${d.tests} online test${d.tests === 1 ? "" : "s"} · ${d.students} students · ${d.sheets} answer sheets` : "From this batch's online tests"}
      toolbar={
        account?.role === Role.ADMIN ? (
          <Button variant="outline" className="h-9 gap-2" onClick={refreshStats} disabled={refreshing} title="Recompute every question's difficulty from all answer sheets">
            {refreshing ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
            Refresh difficulty data
          </Button>
        ) : undefined
      }
    >
      {!d ? (
        loading ? (
          <div className="mx-auto max-w-3xl space-y-3 p-4" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <ErrorState message={error ?? "Couldn't load insights."} onRetry={refresh} className="py-12" />
        )
      ) : d.reteach.length === 0 ? (
        <EmptyState className="py-14" icon={<SparklesIcon />} title="Nothing to analyse yet" description="Insights appear once this batch's online tests are rechecked." />
      ) : (
        <Body d={d} batchName={batchName} />
      )}
    </DocumentWindow>
  );
};

const Body = ({ d, batchName }: { d: TBatchInsights; batchName: string }) => {
  const router = useRouter();
  const [allChapters, setAllChapters] = useState(false);
  const [tab, setTab] = useState<"hardest" | "suspect">("hardest");

  const practice = (chapters: { chapterId: string; subject: string; course: string }[], source: string) => {
    const bySubject: Record<string, string[]> = {};
    chapters.forEach((c) => (bySubject[c.subject] ??= []).push(c.chapterId));
    if (writePracticePrefill({ course: chapters.find((c) => c.course)?.course ?? "", chapters: bySubject, source })) router.push("/generate-paper");
  };

  const shown = allChapters ? d.reteach : d.reteach.slice(0, SHOW);
  const questions = tab === "hardest" ? d.hardest : d.suspect;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <section>
        <p className={label}>Re-teach list · weakest first</p>
        <div className="mt-1 divide-y">
          {shown.map((c) => (
            <AccuracyBar
              key={c.chapterId}
              label={c.title}
              accuracy={c.accuracy}
              detail={`${c.subject ? `${c.subject} · ` : ""}${c.studentsBelow} of ${c.studentsTested} students below 50% · ${c.attempted} answers`}
            />
          ))}
        </div>
        {d.reteach.length > SHOW && (
          <Button variant="ghost" className="mt-1 h-9 w-full text-brand" onClick={() => setAllChapters((v) => !v)}>
            {allChapters ? "Show less" : `See all ${d.reteach.length} chapters`}
          </Button>
        )}
      </section>

      {d.groups.length > 0 && (
        <section>
          <p className={label}>Groups to support</p>
          <p className="mt-1 text-sm text-muted-foreground">Students below 50% in a chapter the batch finds hard. One practice paper per group.</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {d.groups.map((g) => (
              <div key={g.chapterId} className="rounded-xl border bg-card p-3 shadow-sm">
                <div className="flex items-start gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{g.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {g.subject} · batch <span className={cn("font-semibold", accuracyText(g.accuracy))}>{pctOf(g.accuracy)}</span>
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <UsersIcon className="size-3.5" /> {g.students.length}
                  </span>
                </div>
                <ul className="mt-2 flex flex-wrap gap-1">
                  {g.students.map((s) => (
                    <li key={s.userId} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {s.name} <span className={cn("font-semibold tabular-nums", accuracyText(s.accuracy))}>{pctOf(s.accuracy)}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="mt-3 h-9 w-full gap-2 text-brand" onClick={() => practice([g], `${g.title} group (${batchName})`)}>
                  <WandSparklesIcon className="size-4" /> Practice paper
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn(label, "mr-auto")}>Questions to review</p>
          <div role="tablist" aria-label="Questions" className="flex rounded-lg border bg-muted p-0.5">
            {(
              [
                ["hardest", `Hardest · ${d.hardest.length}`],
                ["suspect", `Suspect · ${d.suspect.length}`],
              ] as const
            ).map(([k, t]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn("h-8 rounded-md px-3 text-sm font-medium text-muted-foreground", tab === k && "bg-card text-foreground shadow-sm")}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {tab === "hardest"
            ? "Lowest share answered right in this batch. Make variants to practise the same idea."
            : "Results that usually mean a wrong answer key or a confusing question. Check the answer first."}
        </p>
        {questions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{tab === "suspect" ? "No suspect questions. 🎉" : "Not enough answers yet."}</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {questions.map((q, i) => (
              <ReviewItem key={q._id} q={q} n={i + 1} suspect={tab === "suspect"} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
};

const ReviewItem = ({ q, n, suspect }: { q: TInsightQuestion; n: number; suspect: boolean }) => {
  const router = useRouter();
  const [editAns, setEditAns] = useState(false);
  const [ans, setAns] = useState(q.ans);
  const question = { _id: q._id, text: q.text, ans, mark: q.mark, tags: q.tags, chapter: q.chapter ? { _id: q.chapter.chapterId, ...q.chapter } : undefined } as any;

  return (
    <li className="defer-offscreen overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-xs">
        <span className="text-sm font-bold">Q{n}</span>
        <span className={cn("rounded-full px-2 py-0.5 font-semibold tabular-nums", q.batchCorrectRate !== null && q.batchCorrectRate < 0.4 ? "bg-red-50 text-red-700" : "bg-muted text-muted-foreground")}>
          {pctOf(q.batchCorrectRate)} right here
        </span>
        <DifficultyBadge stats={q.stats} />
        {q.chapter && <span className="truncate text-muted-foreground">{q.chapter.title}</span>}
      </div>
      {suspect && q.reason && (
        <p className="flex items-center gap-1.5 border-b bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
          <AlertTriangleIcon className="size-3.5" /> {q.reason}
        </p>
      )}
      <div className="overflow-x-auto px-1 text-sm [&_#preview]:!py-1">
        <Markdown text={q.text} />
      </div>
      <div className="flex items-start gap-1.5 px-3 pb-2 text-sm text-muted-foreground">
        <strong className="shrink-0 text-foreground">Key:</strong>
        <div className="min-w-0 flex-1 overflow-x-auto [&_#preview]:!p-0">
          <Markdown text={ans || "—"} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t px-3 py-2">
        <Button variant="brand" className="h-9 gap-1.5" onClick={() => sendToVariants(question, router, `Q${n}`)}>
          <SparklesIcon className="size-4" /> Generate variant
        </Button>
        {suspect && (
          <Button variant="outline" className="h-9 gap-1.5" onClick={() => setEditAns(true)}>
            <PenLineIcon className="size-4" /> Fix answer
          </Button>
        )}
      </div>
      {editAns && (
        <EditMarkdownSheet
          open
          title="Fix answer"
          text={ans}
          onOpenChange={(o) => !o && setEditAns(false)}
          onSave={async (text) => {
            try {
              await putUpdateQuestion({ id: q._id, ans: text } as any);
              setAns(text);
              toast.success("Answer updated. Recheck the test to update scores.");
            } catch (err) {
              toast.error((err as Error)?.message || "Couldn't save the answer");
            }
            setEditAns(false);
          }}
        />
      )}
    </li>
  );
};
