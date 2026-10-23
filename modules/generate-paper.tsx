"use client";

import PaperFrame from "@/components/frames/paper-frame";
import { TAGS } from "@/components/sheets/add-tag-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ChapterPicker from "@/components/ui/chapter-picker";
import { Checkbox } from "@/components/ui/checkbox";
import GeneratedQuestionCard from "@/components/ui/generated-question-card";
import { Input } from "@/components/ui/input";
import PreviewButton from "@/components/ui/preview-button";
import { Print, PrintContent, PrintTrigger } from "@/components/ui/print";
import SavePaperButton from "@/components/ui/save-paper-button";
import SelectCompact from "@/components/ui/select-compact";
import { Skeleton } from "@/components/ui/skeleton";
import { MARKS } from "@/data/const";
import useAvailability from "@/hooks/useAvailability";
import useBooksOfSubjects from "@/hooks/useBooksOfSubjects";
import useChaptersOfBooks from "@/hooks/useChaptersOfBooks";
import { useCourses } from "@/hooks/useCourses";
import useGeneratePaper from "@/hooks/useGeneratePaper";
import { cn, getTotalMarks } from "@/lib/utils";
import type { TChapter } from "@/models/Chapter";
import type { TQuestion } from "@/models/Question";
import { postUpdateUsage, type TGenerateSection } from "@/service/core.service";
import { useAuthorStore } from "@/stores/authorStore";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Columns2Icon,
  EyeIcon,
  EyeOffIcon,
  PrinterIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  ShuffleIcon,
  TriangleAlertIcon,
  WandSparklesIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const COUNT_PRESETS = [10, 20, 25, 30, 50];

// What the teacher has set for one subject. A paper is a handful of these, and
// a single-subject paper is simply one of them - there is no separate path.
type TSubjectPlan = {
  chapterIds: string[];
  count: string;
  marks: string;
  tag: string;
  unusedOnly: boolean;
};

const emptyPlan = (): TSubjectPlan => ({
  chapterIds: [],
  count: "30",
  marks: "",
  tag: "",
  unusedOnly: false,
});

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
  useEffect(() => {
    setPlans({});
    if (!subjects.includes(subject)) setSubject(subjects[0] ?? "");
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
          tags: plans[s].tag ? [plans[s].tag] : undefined,
          unusedOnly: plans[s].unusedOnly,
        })),
    [subjects, plans]
  );

  const { availability, loading: counting } = useAvailability(sections);
  const {
    questions,
    result,
    loading,
    generate,
    removeQuestion,
    swapQuestion,
    swapping,
    reset,
  } = useGeneratePaper();

  const totalWanted = sections.reduce((sum, s) => sum + s.maxQuestions, 0);
  const canGenerate = sections.length > 0 && totalWanted > 0 && !loading;
  const totalMarks = getTotalMarks(questions);

  const availableByChapter = useMemo(
    () => new Map((availability?.perChapter ?? []).map((c) => [c.chapter, c.available])),
    [availability]
  );
  const availabilityBySubject = useMemo(
    () => new Map((availability?.sections ?? []).map((s) => [s.subject, s])),
    [availability]
  );
  const chapterById = useMemo(
    () => new Map(chapters.map((c) => [c._id, c])),
    [chapters]
  );

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
    "space-y-3",
    twoColumn &&
      "md:space-y-0 md:columns-2 md:gap-3 md:[&>li]:mb-3 md:[&>li]:break-inside-avoid"
  );

  /* ------------------------------ subject row ------------------------------ */

  // Every subject of the course is shown; the muted ones are simply not in the
  // paper yet. Tapping one switches the panel below to it, so there is no
  // separate control for adding or removing a subject.
  const subjectRow = (
    <div className="shrink-0 px-3 pt-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
      {subjects.map((s) => {
        const count = plans[s]?.chapterIds.length ?? 0;
        const active = s === activeSubject;
        const info = availabilityBySubject.get(s);
        const thin = info && count > 0 && info.available < info.requested;
        return (
          <button
            key={s}
            onClick={() => setSubject(s)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : count > 0
                  ? "bg-sky-50 text-sky-900 border-sky-200"
                  : "bg-white text-slate-400 border-slate-200"
            )}
          >
            {s}
            {count > 0 && (
              <span className={cn("ml-1.5 tabular-nums", thin && !active && "text-amber-600")}>
                {plans[s].count}Q
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  /* ------------------------------- setup pane ------------------------------ */

  const setupPane = (
    // Phone: the whole panel scrolls as one column with Generate stuck to the
    // bottom. Desktop: a fixed panel whose chapter tree scrolls on its own.
    <div className="flex flex-col w-full h-full min-h-0 bg-white overflow-y-auto lg:overflow-hidden">
      <div className="shrink-0 px-3 pt-3 border-b-0">
        <SelectCompact
          label="Class"
          placeholder="Class"
          value={course}
          onChange={setCourse}
          options={courses.map((c) => ({ label: c, value: c }))}
        />
      </div>

      {subjectRow}

      <div className="shrink-0 px-3 pb-3 border-b border-slate-200 space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-600">
            Questions from {activeSubject}
          </label>
          {/* Pill presets and a bordered box for a free number: six identical
              bordered controls in a row read as six presets, and the last one
              silently was not */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="grid grid-cols-5 gap-1 flex-1 min-w-0">
              {COUNT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setPlan({ count: String(preset) })}
                  className={cn(
                    "h-8 rounded-full text-xs font-medium transition-colors",
                    Number(plan.count) === preset
                      ? "bg-primary text-primary-foreground"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
            <Input
              type="number"
              min={1}
              max={300}
              value={plan.count}
              onChange={(e) => setPlan({ count: e.target.value })}
              aria-label={`Questions from ${activeSubject}`}
              className="w-14 shrink-0 h-9 px-1 text-center tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <SelectCompact
            label="Marks"
            placeholder="Any"
            value={plan.marks}
            onChange={(value) => setPlan({ marks: value })}
            options={MARKS.map((mark) => ({
              label: `${mark} mark`,
              value: String(mark || 1),
            }))}
            canUnselect
          />
          <SelectCompact
            label="Tag"
            placeholder="Any"
            value={plan.tag}
            onChange={(value) => setPlan({ tag: value })}
            options={TAGS.map((tag) => ({ label: tag, value: tag }))}
            canUnselect
          />
        </div>

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
          className="flex items-center gap-2 text-sm cursor-pointer py-1 focus:outline-none"
        >
          <Checkbox
            checked={plan.unusedOnly}
            tabIndex={-1}
            className="pointer-events-none"
          />
          Only questions never printed
        </div>
      </div>

      {/* Chapters: the tall, scrolling part of the panel */}
      <div className="lg:flex-1 lg:min-h-0 flex flex-col">
        <div className="shrink-0 px-3 pt-3 pb-1 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {activeSubject} chapters
          </p>
          {plan.chapterIds.length > 0 && (
            <button
              className="text-xs text-sky-600 hover:underline"
              onClick={() => setPlan({ chapterIds: [] })}
            >
              Clear {plan.chapterIds.length}
            </button>
          )}
        </div>

        {/* What is ticked, visible without scrolling the tree back up */}
        {plan.chapterIds.length > 0 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5 max-h-[104px] overflow-y-auto">
            {plan.chapterIds.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 bg-sky-100 text-sky-900 rounded-full pl-2.5 pr-1 py-1 text-xs max-w-full"
              >
                <span className="truncate max-w-[150px]">
                  {chapterById.get(id)?.title ?? "Chapter"}
                </span>
                <button
                  aria-label="Remove chapter"
                  className="rounded-full hover:bg-sky-200 p-0.5"
                  onClick={() =>
                    setPlan({ chapterIds: plan.chapterIds.filter((c) => c !== id) })
                  }
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="lg:flex-1 lg:min-h-0 flex flex-col border-t border-slate-200">
          <ChapterPicker
            className="lg:flex-1"
            books={subjectBooks}
            chapters={subjectChapters}
            booksLoading={booksLoading}
            chaptersLoading={chaptersLoading}
            selected={plan.chapterIds}
            onChange={(chapterIds) => setPlan({ chapterIds })}
            availableByChapter={availableByChapter}
          />
        </div>
      </div>

      {/* Generate: stuck to the bottom of the scroll on a phone, the foot of
          the panel on desktop */}
      <div className="shrink-0 sticky bottom-0 lg:static border-t border-slate-200 p-3 bg-white">
        <div className="flex items-center justify-between gap-2 text-xs mb-2 min-h-[18px]">
          {sections.length === 0 ? (
            <span className="text-slate-400">Pick at least one chapter</span>
          ) : (
            <>
              <span className="text-slate-600 truncate">
                <strong className="tabular-nums">{totalWanted}</strong> questions ·{" "}
                {sections.length} subject{sections.length === 1 ? "" : "s"}
              </span>
              {counting ? (
                <span className="text-slate-400 shrink-0">counting…</span>
              ) : availability ? (
                <span className="text-slate-500 shrink-0 tabular-nums">
                  {availability.available.toLocaleString()} available
                </span>
              ) : null}
            </>
          )}
        </div>

        {/* Which subject is short, before generating rather than after */}
        {availability?.sections.some((s) => s.available < s.requested) && (
          <p className="text-[11px] text-amber-600 font-medium mb-2">
            {availability.sections
              .filter((s) => s.available < s.requested)
              .map((s) => `${s.subject}: only ${s.available} of ${s.requested}`)
              .join(" · ")}
          </p>
        )}

        <Button
          className="w-full h-11 text-base"
          disabled={!canGenerate}
          onClick={() => runGenerate()}
        >
          {loading ? (
            <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <WandSparklesIcon className="w-4 h-4 mr-2" />
          )}
          {questions.length > 0 ? "Generate again" : "Generate paper"}
        </Button>

        {/* A paper already made is a step forward from here, so the way back
            to it sits next to the button that would replace it */}
        {questions.length > 0 && (
          <Button
            variant="ghost"
            className="lg:hidden w-full h-10 mt-1 text-sky-700"
            onClick={() => setView("paper")}
          >
            View paper ({questions.length})
            <ChevronRightIcon className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );

  /* ------------------------------- paper pane ------------------------------ */

  // Declared before the paper pane, which renders it into its phone-only
  // footer: a const is in its temporal dead zone until this line runs
  const actions = (
    <>
      <SavePaperButton defaultAuthor={author} questions={questions} />
      <PreviewButton
        questions={questions}
        onPrint={() => postUpdateUsage(questions)}
        defaultTwoColumn={twoColumn}
        onQuestionRemove={removeQuestion}
        editable
      />
      <Print>
        <PrintTrigger
          disabled={questions.length === 0}
          onClick={() => postUpdateUsage(questions)}
        >
          <PrinterIcon className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Print</span>
        </PrintTrigger>
        <PrintContent>
          <PaperFrame
            questions={questions}
            twoColumn={twoColumn}
            course={course}
            subject={activeSubject}
          />
        </PrintContent>
      </Print>
    </>
  );

  const paperToolbar = (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-slate-50 overflow-x-auto scrollbar-hide">
      <Button
        size="sm"
        variant="ghost"
        className="lg:hidden shrink-0 -ml-2 px-2"
        onClick={() => setView("setup")}
      >
        <ChevronLeftIcon className="w-4 h-4 mr-0.5" />
        Setup
      </Button>
      <Badge variant="secondary" className="shrink-0 tabular-nums">
        {questions.length} Q
      </Badge>
      <Badge variant="secondary" className="shrink-0 tabular-nums">
        {totalMarks} marks
      </Badge>
      {result && (
        <span className="text-[11px] text-slate-400 shrink-0 tabular-nums hidden sm:inline">
          seed {result.seed}
        </span>
      )}
      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant="outline"
          disabled={loading || !canGenerate}
          onClick={() => runGenerate(true)}
          title="A different paper from the same chapters"
        >
          <ShuffleIcon className={cn("w-4 h-4", loading && "animate-spin")} />
          <span className="hidden sm:inline ml-1.5">Reshuffle</span>
        </Button>
        <Button
          size="sm"
          variant={showAnswers ? "default" : "outline"}
          onClick={() => setShowAnswers(!showAnswers)}
          title="Show every answer"
        >
          {showAnswers ? (
            <EyeOffIcon className="w-4 h-4" />
          ) : (
            <EyeIcon className="w-4 h-4" />
          )}
        </Button>
        <Button
          size="sm"
          variant={twoColumn ? "default" : "outline"}
          onClick={() => setTwoColumn(!twoColumn)}
          title="Two columns, here and in print"
          // Shown from the width where it actually splits the list; a phone
          // sets print columns from the preview sheet's own toggle
          className="hidden md:inline-flex"
        >
          <Columns2Icon className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            reset();
            setCollapsedSubjects([]);
            setOpenAnswers([]);
          }}
          title="Start over"
        >
          <RotateCcwIcon className="w-4 h-4" />
        </Button>
      </div>
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
          swapQuestion(question, {
            marks: planOf?.marks ? Number(planOf.marks) : undefined,
            tags: planOf?.tag ? [planOf.tag] : undefined,
            unusedOnly: planOf?.unusedOnly,
          });
        }}
        onRemove={() => removeQuestion(question)}
      />
    );
  };

  const paperPane = (
    <div className="flex flex-col h-full min-h-0">
      {questions.length > 0 && paperToolbar}

      {result?.short && questions.length > 0 && (
        <div className="mx-3 mt-3 flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
          <TriangleAlertIcon className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <p>
            {result.sections
              .filter((s) => s.short)
              .map((s) => `${s.subject ?? "Paper"} ${s.picked} of ${s.requested}`)
              .join(", ")}{" "}
            — not enough questions. Widen the filters or add chapters.
          </p>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading && questions.length === 0 ? (
          <div className="p-3 space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : questions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 py-16 text-slate-400">
            <div className="rounded-full bg-slate-100 p-5 mb-4">
              <WandSparklesIcon className="w-10 h-10 text-slate-400" strokeWidth={1.4} />
            </div>
            <p className="text-base font-medium text-slate-600">No paper yet</p>
            <p className="text-sm max-w-[280px] pt-1">
              Set how many questions you want from each subject, pick chapters, then
              generate. Every run picks a different set.
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-3">
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
                <div key={`${block.subject}-${blockIndex}`} className="space-y-3">
                  {/* Sticky, so you always know which subject you are reading
                      once a block runs past a screenful */}
                  <button
                    onClick={() => toggleSubject(block.subject)}
                    aria-expanded={!collapsed}
                    className={cn(
                      "sticky top-0 z-10 w-full flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors",
                      collapsed
                        ? "bg-slate-100 border-slate-200 hover:bg-slate-200"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <ChevronRightIcon
                      className={cn(
                        "w-4 h-4 shrink-0 text-slate-400 transition-transform",
                        !collapsed && "rotate-90"
                      )}
                    />
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                      {block.subject}
                    </h3>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {block.items.length} Q ·{" "}
                      {getTotalMarks(block.items.map((i) => i.question))} marks
                    </span>
                    <span className="ml-auto text-[11px] text-slate-400 tabular-nums">
                      {collapsed
                        ? "show"
                        : `${block.items[0].index + 1}–${
                            block.items[block.items.length - 1].index + 1
                          }`}
                    </span>
                  </button>

                  {!collapsed && (
                    <ol className={cardListClass}>{block.items.map(renderCard)}</ol>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save, preview and print do not fit beside the title on a phone, so on
          a phone they sit under the paper they act on */}
      {questions.length > 0 && (
        <div className="lg:hidden shrink-0 border-t border-slate-200 bg-white px-3 py-2 flex items-center gap-2 [&>*]:flex-1">
          {actions}
        </div>
      )}
    </div>
  );

  /* --------------------------------- shell -------------------------------- */

  return (
    // The app header sits above this and is not a flex parent, so the panes
    // get an explicit height. dvh, not vh: on a phone the address bar would
    // otherwise push the Generate button off the bottom.
    <div className="flex flex-col h-[calc(100dvh-56px)] sm:h-[calc(100dvh-66px)] bg-slate-100">
      {/* On a phone the title alone: setting up and reading the paper are two
          steps of one task, not two tabs, so moving between them belongs to
          the step you are in - Generate carries you forward, a back button on
          the paper brings you here again. */}
      <div className="shrink-0 bg-slate-300 border-b border-slate-200 px-3 md:px-6 py-2 flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-bold flex items-center gap-2 min-w-0">
          <WandSparklesIcon className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {view === "paper" ? "Your Paper" : "Generate Paper"}
          </span>
        </h1>

        <div className="hidden lg:flex ml-auto items-center gap-2 shrink-0">
          <div className="flex flex-col items-end leading-tight text-xs mr-1">
            <span>
              <strong className="tabular-nums">{questions.length}</strong> questions
            </span>
            <span className="text-slate-600">
              <strong className="tabular-nums">{totalMarks}</strong> marks
            </span>
          </div>
          {actions}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* Desktop: setup beside the paper. Mobile: whichever pane is chosen. */}
        <aside
          className={cn(
            "w-full lg:w-[360px] xl:w-[400px] shrink-0 lg:border-r border-slate-200 min-h-0",
            view === "setup" ? "flex" : "hidden",
            "lg:flex"
          )}
        >
          {setupPane}
        </aside>
        <main
          className={cn(
            "flex-1 min-h-0 bg-slate-100",
            view === "paper" ? "flex flex-col" : "hidden",
            "lg:flex lg:flex-col"
          )}
        >
          {paperPane}
        </main>
      </div>
    </div>
  );
}
