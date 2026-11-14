"use client";

import PaperFrame from "@/components/frames/paper-frame";
import TagQuotaPicker from "@/components/ui/tag-quota-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import ChapterPicker from "@/components/ui/chapter-picker";
import { Checkbox } from "@/components/ui/checkbox";
import GeneratedQuestionCard from "@/components/ui/generated-question-card";
import { Input } from "@/components/ui/input";
import PreviewButtonV2 from "@/components/ui/preview-button-v2";
import { Print, PrintContent, PrintTrigger } from "@/components/ui/print";
import SavePaperButton from "@/components/ui/save-paper-button";
import SelectCompact from "@/components/ui/select-compact";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/state-message";
import { MARKS } from "@/data/const";
import useAvailability from "@/hooks/useAvailability";
import useBooksOfSubjects from "@/hooks/useBooksOfSubjects";
import useChaptersOfBooks from "@/hooks/useChaptersOfBooks";
import { useCourses } from "@/hooks/useCourses";
import useGeneratePaper from "@/hooks/useGeneratePaper";
import { cn, courseLabel, getTotalMarks } from "@/lib/utils";
import type { TChapter } from "@/models/Chapter";
import type { TQuestion } from "@/models/Question";
import { postUpdateUsage, type TGenerateSection } from "@/service/core.service";
import { useAuthorStore } from "@/stores/authorStore";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Columns2Icon,
  EyeIcon,
  EyeOffIcon,
  FileTextIcon,
  PrinterIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  ShuffleIcon,
  SlidersHorizontalIcon,
  TriangleAlertIcon,
  WandSparklesIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const COUNT_PRESETS = [10, 20, 25, 30, 50];

// What the teacher has set for one subject. A paper is a handful of these, and
// a single-subject paper is simply one of them - there is no separate path.
type TSubjectPlan = {
  chapterIds: string[];
  count: string;
  marks: string;
  // "5 of these must be Numerical". A quota, not a filter: whatever the
  // quotas do not account for is drawn from every tag.
  requirements: { tag: string; count: string }[];
  unusedOnly: boolean;
};

const emptyPlan = (): TSubjectPlan => ({
  chapterIds: [],
  count: "30",
  marks: "",
  requirements: [],
  unusedOnly: false,
});

// Plans and the generated paper are kept on this device until saved, and
// restored automatically, as on Create Paper
const DRAFT_KEY = "generate-paper:draft";
type TDraft = {
  course: string;
  subject: string;
  plans: Record<string, TSubjectPlan>;
  questions: TQuestion[];
  savedAt: number;
};
const readDraft = (): TDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const d = raw ? (JSON.parse(raw) as TDraft) : null;
    if (!d || typeof d.plans !== "object" || !Array.isArray(d.questions)) return null;
    const hasPlan = Object.values(d.plans).some((p) => p?.chapterIds?.length);
    return hasPlan || d.questions.length ? d : null;
  } catch {
    return null;
  }
};
const ago = (time: number) => {
  const mins = Math.round((Date.now() - time) / 60000);
  if (!Number.isFinite(mins) || mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
};

export default function GeneratePaper() {
  const { course, subject, setCourse, setSubject, courses, subjects } = useCourses();
  const { author } = useAuthorStore();

  // One plan per subject, keyed by subject name
  const [plans, setPlans] = useState<Record<string, TSubjectPlan>>({});
  const activeSubject = subject;

  const [twoColumn, setTwoColumn] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);
  const [openAnswers, setOpenAnswers] = useState<string[]>([]);
  // Subjects folded away in the paper, so one can be read without scrolling
  // past the other two
  const [collapsedSubjects, setCollapsedSubjects] = useState<string[]>([]);
  const [view, setView] = useState<"setup" | "paper">("setup");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Every book of every subject on this course, so switching subject needs no
  // new request and chapters from any subject can be named
  const { books, loading: booksLoading } = useBooksOfSubjects(subjects, course);
  const bookIds = useMemo(() => books.map((b) => b._id), [books]);
  const { chapters, loading: chaptersLoading } = useChaptersOfBooks(bookIds);

  const plan = plans[activeSubject] ?? emptyPlan();
  const setPlan = (patch: Partial<TSubjectPlan>) =>
    setPlans((prev) => ({
      ...prev,
      [activeSubject]: { ...(prev[activeSubject] ?? emptyPlan()), ...patch },
    }));

  // Changing class throws away a plan built from another class's chapters, and
  // moves off a subject the new class does not teach - useCourses keeps the
  // subject it was given, so Class 11 would otherwise still be showing Science
  // A class set by restoring a draft keeps the draft's plans
  const restoringCourse = useRef<string | null>(null);
  useEffect(() => {
    if (restoringCourse.current === course) restoringCourse.current = null;
    else setPlans({});
    if (!subjects.includes(subject)) setSubject(subjects[0] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, subjects.join(",")]);

  const subjectBooks = useMemo(
    () => books.filter((b) => b.subject === activeSubject),
    [books, activeSubject]
  );
  const subjectChapters = useMemo(
    () => chapters.filter((c) => c.subject === activeSubject),
    [chapters, activeSubject]
  );

  // Only subjects with chapters picked become sections of the paper
  const sections: TGenerateSection[] = useMemo(
    () =>
      subjects
        .filter((s) => (plans[s]?.chapterIds.length ?? 0) > 0)
        .map((s) => ({
          subject: s,
          chapterIds: plans[s].chapterIds,
          maxQuestions: Number(plans[s].count) || 0,
          marks: plans[s].marks ? Number(plans[s].marks) : undefined,
          unusedOnly: plans[s].unusedOnly,
          requirements: plans[s].requirements
            .filter((r) => r.tag && Number(r.count) > 0)
            .map((r) => ({ tag: r.tag, count: Number(r.count) })),
        })),
    [subjects, plans]
  );

  const { availability, loading: counting } = useAvailability(sections);

  const {
    questions,
    result,
    loading,
    generate,
    setQuestions,
    removeQuestion,
    swapQuestion,
    swapping,
    reset,
  } = useGeneratePaper();

  // ---- Draft -------------------------------------------------------------
  const [restored, setRestored] = useState<number | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    const d = readDraft();
    if (d) {
      if (d.course && d.course !== course) {
        restoringCourse.current = d.course;
        setCourse(d.course);
      }
      setPlans(d.plans ?? {});
      if (d.subject) setSubject(d.subject);
      setQuestions(d.questions ?? []);
      setRestored(d.savedAt);
      // Straight to the restored paper on a phone (the notice lives there)
      if (d.questions?.length) setView("paper");
    }
    setDraftReady(true);
    // Once, on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!draftReady) return;
    try {
      const hasPlan = Object.values(plans).some((p) => p?.chapterIds?.length);
      if (!hasPlan && questions.length === 0) localStorage.removeItem(DRAFT_KEY);
      else {
        const value: TDraft = { course, subject, plans, questions, savedAt: Date.now() };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
      }
    } catch {}
  }, [draftReady, course, subject, plans, questions]);
  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setRestored(null);
  };

  const totalWanted = sections.reduce((sum, s) => sum + s.maxQuestions, 0);
  // Checked across every subject, not just the one on screen: a quota set on
  // Chemistry and then left behind would otherwise block nothing
  const subjectOverAllocated = subjects.filter((s) => {
    const p = plans[s];
    if (!p || p.chapterIds.length === 0) return false;
    const required = p.requirements.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
    return required > (Number(p.count) || 0);
  });

  const canGenerate =
    sections.length > 0 &&
    totalWanted > 0 &&
    subjectOverAllocated.length === 0 &&
    !loading;
  const totalMarks = getTotalMarks(questions);

  const availableByChapter = useMemo(
    () => new Map((availability?.perChapter ?? []).map((c) => [c.chapter, c.available])),
    [availability]
  );
  const availabilityBySubject = useMemo(
    () => new Map((availability?.sections ?? []).map((s) => [s.subject, s])),
    [availability]
  );

  // How many questions carry this tag in the chapters picked for the subject.
  // Undefined until the count comes back; a tag the chapters do not have at
  // all is genuinely 0, which is the thing worth showing.
  const requirementInfo = (subjectName: string, tag: string) => {
    const info = availabilityBySubject.get(subjectName);
    if (!info?.tagCounts) return undefined;
    return info.tagCounts.find((t) => t.tag === tag)?.available ?? 0;
  };
  const chapterById = useMemo(
    () => new Map(chapters.map((c) => [c._id, c])),
    [chapters]
  );

  const shortWarnings = (availability?.sections ?? []).flatMap((s) => {
    const lines: string[] = [];
    if (s.available < s.requested) {
      lines.push(`${s.subject}: only ${s.available} of ${s.requested}`);
    }
    (s.requirements ?? []).forEach((r) => {
      if (r.available < r.requested) {
        lines.push(
          `${s.subject}: only ${r.available} ${r.tag} of ${r.requested} asked for`
        );
      }
    });
    return lines;
  });

  const runGenerate = async (reroll?: boolean) => {
    const res = await generate({ sections, seed: undefined });
    if (res && !reroll) setView("paper");
  };

  const chapterTitle = (question: TQuestion) => {
    const chapter = question.chapter;
    if (chapter && typeof chapter !== "string") return (chapter as TChapter).title;
    return chapterById.get(String(chapter))?.title;
  };

  const answerOpen = (id?: string) => showAnswers || openAnswers.includes(id ?? "");

  const toggleSubject = (name: string) =>
    setCollapsedSubjects((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );

  // Two columns on screen as well as in print, from the width where a column
  // is still wide enough to read. CSS columns rather than a grid, so the cards
  // flow the way the printed paper does and uneven heights do not leave gaps -
  // which also means space-y has to give way to a margin that survives a
  // column break.
  const cardListClass = cn(
    // Spacing comes from each card's own bottom padding (see GeneratedQuestionCard)
    twoColumn && "md:columns-2 md:gap-2"
  );

  /* ---------------------------- subject select ---------------------------- */

  // Every subject of the course is listed; the ones already in the paper carry
  // their question count ("30Q"). Picking one switches the panel below to it.
  const subjectSelect = (
    <SelectCompact
      placeholder="Subject"
      value={activeSubject}
      onChange={(v) => v && setSubject(v)}
      options={subjects.map((s) => ({
        label: s,
        value: s,
        tag: (plans[s]?.chapterIds.length ?? 0) > 0 ? `${plans[s].count}Q` : undefined,
        tagTone: "info" as const,
      }))}
      className="min-w-0"
    />
  );

  /* ------------------------------- setup pane ------------------------------ */

  const label = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

  // "30 Q · 2 marks · Unused · 1 tag": the subject's settings folded into one line
  const quotaCount = plan.requirements.filter((r) => r.tag && Number(r.count) > 0).length;
  const settingsSummary = [
    `${Number(plan.count) || 0} questions`,
    plan.marks ? `${plan.marks} mark${plan.marks === "1" ? "" : "s"}` : "any marks",
    plan.unusedOnly ? "unused" : "",
    quotaCount ? `${quotaCount} tag rule${quotaCount === 1 ? "" : "s"}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const setupPane = (
    // Class/subjects and the folded settings take two short rows; the chapter
    // list gets everything else and scrolls on its own, Generate at the foot
    <div className="flex h-full min-h-0 w-full flex-col bg-card">
      <div className="grid shrink-0 grid-cols-2 gap-2 border-b p-2.5">
        <SelectCompact
          placeholder="Class"
          value={course}
          onChange={setCourse}
          options={courses.map((c) => ({ label: courseLabel(c), value: c }))}
          className="min-w-0"
        />
        {subjectSelect}
      </div>

      {/* Settings for the subject on screen, folded by default */}
      <div className="shrink-0 border-b">
        <button
          type="button"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((v) => !v)}
          className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
        >
          <SlidersHorizontalIcon className="size-4 shrink-0 text-brand" />
          <span className="min-w-0 flex-1 truncate text-sm">
            <span className="font-semibold">{activeSubject}:</span> {settingsSummary}
          </span>
          <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", settingsOpen && "rotate-180")} />
        </button>
        {settingsOpen && (
          <div className="max-h-[50dvh] space-y-3 overflow-y-auto px-3 pb-3">
            <div className="flex items-center gap-2">
              <div className="grid min-w-0 flex-1 grid-cols-5 gap-1">
                {COUNT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setPlan({ count: String(preset) })}
                    aria-pressed={Number(plan.count) === preset}
                    className={cn(
                      "h-9 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                      Number(plan.count) === preset ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <Input
                inputMode="numeric"
                value={plan.count}
                onChange={(e) => setPlan({ count: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                aria-label={`Questions from ${activeSubject}`}
                className="h-9 w-14 shrink-0 px-1 text-center text-base tabular-nums sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <SelectCompact
                placeholder="Any marks"
                value={plan.marks}
                onChange={(value) => setPlan({ marks: value })}
                options={MARKS.map((mark) => ({ label: `${mark} mark${mark === 1 ? "" : "s"}`, value: String(mark || 1) }))}
                canUnselect
                className="min-w-0"
              />
              {/* The row owns the click: a <label> around Checkbox's button would
                  re-send the click to it and cancel the toggle out */}
              <div
                role="checkbox"
                aria-checked={plan.unusedOnly}
                tabIndex={0}
                onClick={() => setPlan({ unusedOnly: !plan.unusedOnly })}
                onKeyDown={(event) => {
                  if (event.key === " " || event.key === "Enter") {
                    event.preventDefault();
                    setPlan({ unusedOnly: !plan.unusedOnly });
                  }
                }}
                className={cn(
                  "flex h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  plan.unusedOnly ? "border-brand bg-brand-soft text-brand" : "text-muted-foreground"
                )}
                title="Only questions never printed"
              >
                <Checkbox checked={plan.unusedOnly} tabIndex={-1} className="pointer-events-none" />
                Unused
              </div>
            </div>

            {/* Tag quotas: "5 of these must be Numerical" */}
            <TagQuotaPicker
              quotas={plan.requirements}
              onChange={(requirements) => setPlan({ requirements })}
              total={Number(plan.count) || 0}
              availableFor={(tag) => requirementInfo(activeSubject, tag)}
            />
          </div>
        )}
      </div>

      {/* Chapters: everything that's left */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between px-3 pt-2">
          <p className={label}>
            {activeSubject} chapters
            {plan.chapterIds.length > 0 && <span className="ml-1 text-brand">· {plan.chapterIds.length} picked</span>}
          </p>
          {plan.chapterIds.length > 0 && (
            <button className="h-8 rounded-md px-2 text-xs font-medium text-brand hover:bg-brand-soft" onClick={() => setPlan({ chapterIds: [] })}>
              Clear
            </button>
          )}
        </div>
        <ChapterPicker
          className="min-h-0 flex-1 lg:min-h-0"
          books={subjectBooks}
          chapters={subjectChapters}
          booksLoading={booksLoading}
          chaptersLoading={chaptersLoading}
          selected={plan.chapterIds}
          onChange={(chapterIds) => setPlan({ chapterIds })}
          availableByChapter={availableByChapter}
        />
      </div>

      {/* Generate: always at the foot of the panel */}
      <div className="shrink-0 border-t bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-3">
        <div className="mb-2 flex min-h-[18px] items-center justify-between gap-2 text-xs">
          {sections.length === 0 ? (
            <span className="text-muted-foreground">Pick at least one chapter</span>
          ) : (
            <>
              <span className="truncate">
                <strong className="tabular-nums">{totalWanted}</strong> questions · {sections.length} subject
                {sections.length === 1 ? "" : "s"}
              </span>
              {counting ? (
                <span className="shrink-0 text-muted-foreground">counting…</span>
              ) : availability ? (
                <span className="shrink-0 tabular-nums text-muted-foreground">{availability.available.toLocaleString()} available</span>
              ) : null}
            </>
          )}
        </div>
        {subjectOverAllocated.length > 0 && (
          <p className="mb-2 text-xs font-medium text-amber-700">
            {subjectOverAllocated.join(", ")}: the tags add up to more than the subject&apos;s total
          </p>
        )}
        {shortWarnings.length > 0 && <p className="mb-2 text-xs font-medium text-amber-700">{shortWarnings.join(" · ")}</p>}

        <Button variant="brand" className="h-11 w-full gap-2 text-base" disabled={!canGenerate} onClick={() => runGenerate()}>
          {loading ? <RefreshCwIcon className="size-4 animate-spin" /> : <WandSparklesIcon className="size-4" />}
          {questions.length > 0 ? "Generate again" : "Generate paper"}
        </Button>
        {questions.length > 0 && (
          <Button variant="ghost" className="mt-1 h-10 w-full gap-1 text-brand lg:hidden" onClick={() => setView("paper")}>
            View paper ({questions.length}) <ChevronRightIcon className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );

  /* ------------------------------- paper pane ------------------------------ */

  const printButton = (className?: string) => (
    <Print>
      <PrintTrigger
        className={cn(buttonVariants({ variant: "brand" }), "gap-2", className)}
        disabled={questions.length === 0}
        onClick={() => postUpdateUsage(questions)}
      >
        <PrinterIcon className="size-4" /> Print
      </PrintTrigger>
      <PrintContent>
        <PaperFrame questions={questions} twoColumn={twoColumn} course={course} subject={activeSubject} />
      </PrintContent>
    </Print>
  );
  const saveButton = (className?: string) => (
    <SavePaperButton defaultAuthor={author} questions={questions} onSaved={clearDraft} className={className} />
  );
  const previewButton = (className?: string) => (
    <PreviewButtonV2
      questions={questions}
      onPrint={() => postUpdateUsage(questions)}
      defaultTwoColumn={twoColumn}
      onQuestionRemove={removeQuestion}
      editable
      className={className}
    />
  );

  // "1M×5 2M×3": the paper's shape at a glance
  const breakdown = useMemo(() => {
    const map = new Map<number, number>();
    for (const q of questions) map.set(q.mark || 0, (map.get(q.mark || 0) ?? 0) + 1);
    return Array.from(map.entries()).sort((x, y) => x[0] - y[0]);
  }, [questions]);

  const toolButton = "flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50";

  const paperToolbar = (
    <div className="flex shrink-0 items-center gap-1 border-b bg-background px-2 py-1.5 lg:px-4">
      <Button variant="ghost" className="-ml-1 h-9 gap-0.5 px-2 lg:hidden" onClick={() => setView("setup")}>
        <ChevronLeftIcon className="size-4" /> Setup
      </Button>
      <h1 className="mr-auto min-w-0 truncate font-bold">
        <span className="hidden lg:inline">Your paper </span>
        <span className="text-sm font-normal text-muted-foreground lg:ml-1">
          {questions.length} Q · {totalMarks} marks
        </span>
      </h1>
      <button className={toolButton} disabled={loading || !canGenerate} onClick={() => runGenerate(true)} title="A different paper from the same chapters">
        <ShuffleIcon className={cn("size-4", loading && "animate-spin")} />
        <span className="hidden sm:inline">Reshuffle</span>
      </button>
      <button
        className={cn(toolButton, showAnswers && "bg-brand-soft text-brand")}
        aria-pressed={showAnswers}
        onClick={() => setShowAnswers(!showAnswers)}
        title="Show every answer"
      >
        {showAnswers ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        <span className="hidden sm:inline">Answers</span>
      </button>
      <button
        className={cn(toolButton, "hidden md:flex", twoColumn && "bg-brand-soft text-brand")}
        aria-pressed={twoColumn}
        onClick={() => setTwoColumn(!twoColumn)}
        title="Two columns, here and in print"
      >
        <Columns2Icon className="size-4" />
        <span className="hidden xl:inline">2 columns</span>
      </button>
      <button
        className={toolButton}
        onClick={() => {
          reset();
          setCollapsedSubjects([]);
          setOpenAnswers([]);
        }}
        title="Start over"
        aria-label="Start over"
      >
        <RotateCcwIcon className="size-4" />
      </button>
    </div>
  );

  // The paper runs subject by subject, so it is read that way too. The
  // questions already arrive in contiguous blocks, so walking them in order and
  // starting a block wherever the subject changes keeps the paper's own order -
  // and the number each question carries stays its number in the whole paper,
  // not its position inside a block.
  const subjectBlocks = useMemo(() => {
    const blocks: {
      subject: string;
      items: { question: TQuestion; index: number }[];
    }[] = [];

    questions.forEach((question, index) => {
      const chapter = question.chapter;
      const subjectOf =
        chapter && typeof chapter !== "string"
          ? (chapter as TChapter).subject ?? "Questions"
          : "Questions";

      const last = blocks[blocks.length - 1];
      if (last && last.subject === subjectOf) last.items.push({ question, index });
      else blocks.push({ subject: subjectOf, items: [{ question, index }] });
    });

    return blocks;
  }, [questions]);

  // A single-subject paper needs no heading to collapse
  const showSubjectHeaders = subjectBlocks.length > 1;

  const renderCard = ({
    question,
    index,
  }: {
    question: TQuestion;
    index: number;
  }) => {
    const chapter = question.chapter;
    const subjectOf =
      chapter && typeof chapter !== "string"
        ? (chapter as TChapter).subject
        : undefined;

    return (
      <GeneratedQuestionCard
        key={question._id}
        question={question}
        index={index}
        chapterTitle={chapterTitle(question)}
        answerOpen={answerOpen(question._id)}
        answersForced={showAnswers}
        swapping={swapping.includes(question._id ?? "")}
        onToggleAnswer={() =>
          setOpenAnswers((prev) =>
            prev.includes(question._id ?? "")
              ? prev.filter((id) => id !== question._id)
              : [...prev, question._id ?? ""]
          )
        }
        onSwap={() => {
          const planOf = subjectOf ? plans[subjectOf] : undefined;
          // A question that is on the paper to satisfy a quota is replaced by
          // another carrying that same tag, so swapping one out cannot quietly
          // drop the subject below "5 Numerical".
          const quotaTag = planOf?.requirements.find(
            (r) => Number(r.count) > 0 && question.tags?.includes(r.tag)
          )?.tag;
          swapQuestion(question, {
            marks: planOf?.marks ? Number(planOf.marks) : undefined,
            tags: quotaTag ? [quotaTag] : undefined,
            unusedOnly: planOf?.unusedOnly,
          });
        }}
        onRemove={() => removeQuestion(question)}
      />
    );
  };

  const paperPane = (
    <div className="flex h-full min-h-0 flex-col">
      {questions.length > 0 && paperToolbar}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {restored && (
          <div className="mx-3 mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft px-3 py-2 lg:mx-4">
            <FileTextIcon className="size-4 shrink-0 text-brand" />
            <p className="min-w-0 flex-1 text-sm">Unsaved paper restored · {ago(restored)}</p>
            <Button
              variant="ghost"
              className="h-8 px-2"
              onClick={() => {
                reset();
                setPlans({});
                setCollapsedSubjects([]);
                setOpenAnswers([]);
                clearDraft();
              }}
            >
              Start new
            </Button>
            <Button variant="ghost" className="size-8 p-0" aria-label="Dismiss" onClick={() => setRestored(null)}>
              <XIcon className="size-4" />
            </Button>
          </div>
        )}

        {result?.short && questions.length > 0 && (
          <div className="mx-3 mt-3 flex gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm lg:mx-4">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-700" />
            <p>
              {result.sections
                .filter((s) => s.short)
                .map((s) => `${s.subject ?? "Paper"} ${s.picked} of ${s.requested}`)
                .join(", ")}{" "}
              — not enough questions. Widen the filters or add chapters.
            </p>
          </div>
        )}

        {loading && questions.length === 0 ? (
          <div className="space-y-2 p-3 lg:p-4" aria-busy="true" aria-label="Generating">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : questions.length === 0 ? (
          <EmptyState
            className="py-16"
            icon={<WandSparklesIcon />}
            title="No paper yet"
            description="Set how many questions you want from each subject, pick chapters, then generate. Every run picks a different set."
          />
        ) : (
          <div className="space-y-3 p-3 lg:p-4">
            {subjectBlocks.map((block, blockIndex) => {
              if (!showSubjectHeaders) {
                return (
                  <ol key="all" className={cardListClass}>
                    {block.items.map(renderCard)}
                  </ol>
                );
              }
              const collapsed = collapsedSubjects.includes(block.subject);
              return (
                <div key={`${block.subject}-${blockIndex}`} className="space-y-2">
                  {/* Sticky, so you always know which subject you are reading */}
                  <button
                    onClick={() => toggleSubject(block.subject)}
                    aria-expanded={!collapsed}
                    className="sticky top-0 z-10 flex w-full items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left shadow-sm hover:bg-muted"
                  >
                    <ChevronRightIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !collapsed && "rotate-90")} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">{block.subject}</h3>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {block.items.length} Q · {getTotalMarks(block.items.map((i) => i.question))} marks
                    </span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      {collapsed ? "show" : `${block.items[0].index + 1}–${block.items[block.items.length - 1].index + 1}`}
                    </span>
                  </button>
                  {!collapsed && <ol className={cardListClass}>{block.items.map(renderCard)}</ol>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Paper bar: Save beside Print, as on Create Paper */}
      {questions.length > 0 && (
        <>
          <div className="hidden shrink-0 items-center gap-3 border-t bg-card px-4 py-2.5 lg:flex">
            <FileTextIcon className="size-5 shrink-0 text-brand" />
            <span className="shrink-0 text-sm">
              <span className="font-bold tabular-nums">{questions.length}</span> questions ·{" "}
              <span className="font-bold tabular-nums">{totalMarks}</span> marks
            </span>
            <span className="flex min-w-0 flex-1 gap-1 overflow-hidden">
              {breakdown.map(([m, n]) => (
                <span key={m} className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums">
                  {m}M×{n}
                </span>
              ))}
            </span>
            {saveButton("h-10")}
            {previewButton("h-10")}
            {printButton("h-10 px-5")}
          </div>
          <div className="grid shrink-0 grid-cols-3 gap-2 border-t bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 lg:hidden">
            {saveButton("h-11 w-full px-2")}
            {previewButton("h-11 w-full px-2")}
            {printButton("h-11 px-2")}
          </div>
        </>
      )}
    </div>
  );

  /* --------------------------------- shell -------------------------------- */

  return (
    // dvh, not vh: on a phone the address bar would otherwise push the bottom
    // buttons off screen
    <div className="flex h-[calc(100dvh-var(--app-header-h)-1px)] bg-muted/30">
      {/* Desktop: setup beside the paper. Phone: one step at a time. */}
      <aside
        className={cn("min-h-0 w-full shrink-0 border-r lg:flex lg:w-[22rem] xl:w-[24rem]", view === "setup" ? "flex" : "hidden")}
        aria-label="Paper setup"
      >
        {setupPane}
      </aside>
      <main className={cn("min-h-0 min-w-0 flex-1 flex-col lg:flex", view === "paper" ? "flex" : "hidden")}>{paperPane}</main>
    </div>
  );
}
