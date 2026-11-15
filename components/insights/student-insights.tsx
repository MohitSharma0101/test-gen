"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRightIcon, ArrowUpRightIcon, BrainIcon, ChevronRightIcon, SearchIcon, WandSparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentInsights, type TChapterMastery, type TStudentInsights } from "@/hooks/useInsights";
import { writePracticePrefill } from "@/lib/practicePrefill";
import { cn } from "@/lib/utils";
import { AccuracyBar, accuracyText, pctOf } from "./accuracy-bar";

const label = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

const Trend = ({ c }: { c: TChapterMastery }) => {
  if (c.recentAccuracy === null || c.earlierAccuracy === null) return null;
  const diff = Math.round((c.recentAccuracy - c.earlierAccuracy) * 100);
  if (Math.abs(diff) < 5) return <span className="text-[11px] text-muted-foreground">steady</span>;
  const up = diff > 0;
  return (
    <span className={cn("inline-flex items-center text-[11px] font-semibold tabular-nums", up ? "text-emerald-700" : "text-red-700")} title="Last 30 days vs before">
      {up ? <ArrowUpRightIcon className="size-3.5" /> : <ArrowDownRightIcon className="size-3.5" />}
      {up ? "+" : ""}
      {diff}
    </span>
  );
};

const usePractice = (studentName: string) => {
  const router = useRouter();
  return (chapters: TChapterMastery[]) => {
    const bySubject: Record<string, string[]> = {};
    chapters.forEach((c) => (bySubject[c.subject] ??= []).push(c.chapterId));
    const course = chapters.find((c) => c.course)?.course ?? "";
    if (writePracticePrefill({ course, chapters: bySubject, source: `${studentName}'s weak chapters` })) router.push("/generate-paper");
  };
};

// On the student page: the gist (weakest chapters, gaps) and a button that
// opens everything in a drawer
export const StudentInsightsCard = ({ studentId, studentName }: { studentId: string; studentName: string }) => {
  const { insights: d, loading, error } = useStudentInsights(studentId);
  const [open, setOpen] = useState(false);

  if (!d) {
    return loading ? (
      <div className="space-y-2" aria-busy="true" aria-label="Loading insights">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    ) : (
      <p className="py-4 text-center text-sm text-muted-foreground">{error ?? "No insights yet."}</p>
    );
  }
  if (d.chapters.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">Insights appear once this student&apos;s online tests have been rechecked.</p>;
  }

  return (
    <>
      {d.persistentGaps.length > 0 && (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          <span className="font-semibold">{d.persistentGaps.length} chapter{d.persistentGaps.length === 1 ? "" : "s"} to work on:</span>{" "}
          {d.persistentGaps
            .slice(0, 3)
            .map((c) => c.title)
            .join(", ")}
          {d.persistentGaps.length > 3 ? "…" : ""}
        </p>
      )}
      <p className={label}>Weakest chapters</p>
      <div className="divide-y">
        {d.chapters.filter((c) => c.rated).slice(0, 3).map((c) => (
          <AccuracyBar key={c.chapterId} label={c.title} accuracy={c.accuracy} detail={`${c.subject} · ${c.correct}/${c.attempted} right`} />
        ))}
      </div>
      <Button variant="outline" className="mt-3 h-10 w-full gap-1.5 text-brand" onClick={() => setOpen(true)}>
        Open insights · {d.chapters.length} chapters <ChevronRightIcon className="size-4" />
      </Button>
      {open && <StudentInsightsDrawer d={d} open={open} onOpenChange={setOpen} studentName={studentName} />}
    </>
  );
};

const StudentInsightsDrawer = ({
  d,
  open,
  onOpenChange,
  studentName,
}: {
  d: TStudentInsights;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  studentName: string;
}) => {
  const practice = usePractice(studentName);
  const [query, setQuery] = useState("");

  // Chapters grouped by subject; subjects weakest first, chapters weakest first
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, TChapterMastery[]>();
    for (const c of d.chapters) {
      if (q && !c.title.toLowerCase().includes(q) && !c.subject.toLowerCase().includes(q)) continue;
      const k = c.subject || "Other";
      (map.get(k) ?? map.set(k, []).get(k)!).push(c);
    }
    return Array.from(map.entries())
      .map(([subject, chapters]) => {
        const a = chapters.reduce((s, c) => s + c.attempted, 0);
        const r = chapters.reduce((s, c) => s + c.correct, 0);
        return { subject, chapters, accuracy: a ? r / a : null, attempted: a };
      })
      .sort((x, y) => (x.accuracy ?? 1) - (y.accuracy ?? 1));
  }, [d.chapters, query]);


  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={`${studentName}'s test insights`}
      description={`From ${d.tests} rechecked online test${d.tests === 1 ? "" : "s"}`}
    >
      <div className="space-y-6 p-4">
        {d.persistentGaps.length > 0 && (
          <section className="rounded-xl border border-red-200 bg-red-50/60 p-3">
            <p className={label}>Chapters to work on</p>
            <p className="mt-1 text-sm">Below 50%, or well under their overall {pctOf(d.overall)}, across 5 or more answers:</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {d.persistentGaps.map((c) => (
                <li key={c.chapterId} className="rounded-full bg-card px-2.5 py-1 text-xs font-medium shadow-sm">
                  {c.title} <span className={cn("font-bold tabular-nums", accuracyText(c.accuracy))}>{pctOf(c.accuracy)}</span>
                </li>
              ))}
            </ul>
            <Button variant="brand" className="mt-3 h-10 gap-2" onClick={() => practice(d.persistentGaps)}>
              <WandSparklesIcon className="size-4" /> Practice paper for these
            </Button>
          </section>
        )}

        <section>
          <div className="flex items-center gap-2">
            <p className={cn(label, "mr-auto")}>Chapter mastery</p>
          </div>
          <div className="relative mt-2">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search chapters"
              placeholder="Search chapter or subject"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 pl-9 text-base sm:text-sm"
            />
          </div>
          {groups.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No chapters match.</p>
          ) : (
            groups.map((g) => (
              <div key={g.subject} className="mt-4">
                <div className="sticky top-0 z-10 flex items-baseline gap-2 border-b bg-background/95 py-1.5 backdrop-blur">
                  <h3 className="min-w-0 flex-1 truncate font-semibold">{g.subject}</h3>
                  <span className="text-xs text-muted-foreground">{g.chapters.length} chapters</span>
                  <span className={cn("text-sm font-bold tabular-nums", accuracyText(g.accuracy))}>{pctOf(g.accuracy)}</span>
                </div>
                <div className="divide-y">
                  {g.chapters.map((c) => (
                    <div key={c.chapterId} className={c.rated ? undefined : "opacity-60"}>
                      <AccuracyBar
                        label={c.title}
                        // Too few answers: no percentage to read too much into
                        accuracy={c.rated ? c.accuracy : null}
                        after={c.rated ? <Trend c={c} /> : undefined}
                        detail={c.rated ? `${c.correct}/${c.attempted} right` : `Only ${c.attempted} answer${c.attempted === 1 ? "" : "s"} so far (${c.correct} right)`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        {(d.byTag.length > 0 || d.byMark.length > 1) && (
          <section className="grid gap-4 sm:grid-cols-2">
            {d.byTag.length > 0 && (
              <div>
                <p className={label}>By question type</p>
                {d.byTag.slice(0, 6).map((t) => (
                  <AccuracyBar key={t.key} label={t.key} accuracy={t.accuracy} detail={`${t.attempted} answered`} />
                ))}
              </div>
            )}
            {d.byMark.length > 1 && (
              <div>
                <p className={label}>By marks</p>
                {d.byMark.map((t) => (
                  <AccuracyBar key={t.key} label={t.key} accuracy={t.accuracy} detail={`${t.attempted} answered`} />
                ))}
              </div>
            )}
          </section>
        )}
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <BrainIcon className="size-3.5" /> A chapter needs 5 answers before it gets a percentage. Arrows compare the last 30 days with before.
        </p>
      </div>
    </ResponsiveDrawer>
  );
};
