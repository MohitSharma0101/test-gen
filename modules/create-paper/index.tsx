"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Columns2Icon,
  FileTextIcon,
  HistoryIcon,
  InboxIcon,
  PrinterIcon,
  RectangleVerticalIcon,
  ListIcon,
  RefreshCwIcon,
  ShuffleIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import PaperFrame from "@/components/frames/paper-frame";
import AddTagSheet, { TAGS } from "@/components/sheets/add-tag-sheet";
import EditMarkdownSheet from "@/components/sheets/edit-markdown-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PreviewButtonV2 from "@/components/ui/preview-button-v2";
import { Print, PrintContent, PrintTrigger } from "@/components/ui/print";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import SavePaperButton from "@/components/ui/save-paper-button";
import SelectCompact from "@/components/ui/select-compact";
import { Skeleton } from "@/components/ui/skeleton";
import { MARKS } from "@/data/const";
import useBooks from "@/hooks/useBooks";
import useChapters from "@/hooks/useChapters";
import { useCourses } from "@/hooks/useCourses";
import useQuestions from "@/hooks/useQuestions";
import { cn, courseLabel, getTotalMarks } from "@/lib/utils";
import type { TChapter } from "@/models/Chapter";
import type { TPaper } from "@/models/Paper";
import type { TQuestion } from "@/models/Question";
import { useAuthorStore } from "@/stores/authorStore";
import ChapterList from "@/components/question-bank/chapter-list";
import PaperTray from "./paper-tray";
import QuestionCard, { TQuestionAction } from "@/components/question-bank/question-card";

type TCreatePaperProps = {
  mode?: "create" | "update";
  defaultPaper?: TPaper;
};

const DRAFT_KEY = "create-paper:draft";
type TDraft = { course: string; subject: string; book: string; chapter?: string; questions: TQuestion[]; savedAt: number };

const chapterIdOf = (q: TQuestion) => (typeof q.chapter === "object" ? q.chapter?._id : q.chapter) ?? "";

const readDraft = (key: string): TDraft | null => {
  try {
    const raw = localStorage.getItem(key);
    const draft = raw ? (JSON.parse(raw) as TDraft) : null;
    return draft && Array.isArray(draft.questions) && draft.questions.length ? draft : null;
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

const Pill = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onClick}
    className={cn(
      "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
      on ? "border-brand bg-brand-soft text-brand" : "bg-background text-muted-foreground hover:bg-muted"
    )}
  >
    {children}
  </button>
);

export default function CreatePaper({ defaultPaper }: TCreatePaperProps) {
  const editing = Boolean(defaultPaper?._id);
  const defaultChapter = (defaultPaper?.questions?.[0]?.chapter ?? null) as TChapter | null;

  // ---- What's being browsed -------------------------------------------------
  const { course, subject, setCourse, setSubject, courses, subjects } = useCourses({
    defaultCourse: defaultPaper?.course,
    defaultSubject: typeof defaultChapter === "object" ? defaultChapter?.subject : undefined,
  });
  const [book, setBook] = useState<string>((typeof defaultChapter === "object" && defaultChapter?.book) || "");
  const { books, loading: booksLoading } = useBooks(subject, course);
  const { chapters: chapterData, loading: chaptersLoading } = useChapters(subject, course, book);
  const chapters = useMemo(() => chapterData ?? [], [chapterData]);
  const [chapterId, setChapterId] = useState<string>((typeof defaultChapter === "object" && defaultChapter?._id) || "");
  const chapter = chapters.find((c) => c._id === chapterId);

  const [marks, setMarks] = useState("");
  const [tag, setTag] = useState("");
  const [hideUsed, setHideUsed] = useState(false);
  const filterCount = [marks, tag, hideUsed].filter(Boolean).length;

  const { questions: questionData, loading, lastIndex, totalPages: pagesRaw, totalQuestions: totalRaw, refresh, updateUsage, updateQuestion } =
    useQuestions(chapter?._id, marks, undefined, tag, hideUsed ? 0 : undefined);
  // The API types these as Number objects; plain numbers for maths and JSX
  const totalPages = Number(pagesRaw) || 0;
  const totalQuestions = Number(totalRaw) || 0;
  const questions = useMemo(() => questionData ?? [], [questionData]);

  // ---- The paper -------------------------------------------------------------
  const { author } = useAuthorStore();
  const [selected, setSelected] = useState<TQuestion[]>(defaultPaper?.questions || []);
  const selectedIds = useMemo(() => new Set(selected.map((q) => q._id)), [selected]);
  const totalMarks = getTotalMarks(selected);
  const [twoColumn, setTwoColumn] = useState(true);

  // ---- Panels (phones) and question edits -------------------------------------
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [action, setAction] = useState<{ q: TQuestion; kind: TQuestionAction }>();

  // Each pick depends on the one before: keep them valid
  useEffect(() => {
    const list = subjects ?? [];
    if (!list.includes(subject)) setSubject(list[0] ?? "");
  }, [subjects, subject, setSubject]);
  useEffect(() => {
    if (booksLoading) return;
    if (!books.some((b) => b._id === book)) setBook(books[0]?._id ?? "");
  }, [books, book, booksLoading]);
  useEffect(() => {
    if (chaptersLoading) return;
    if (!chapters.some((c) => c._id === chapterId)) setChapterId(chapters[0]?._id ?? "");
  }, [chapters, chapterId, chaptersLoading]);

  // Page lives in the URL (?page=). A new chapter or filter starts at page 1:
  // keeping page 3 used to show an empty list for a shorter chapter
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 50);
  const goToPage = useCallback(
    (p: number) => router.push(p <= 1 && limit === 50 ? pathname : `${pathname}?page=${p}&limit=${limit}`, { scroll: false }),
    [router, pathname, limit]
  );
  const resetKey = `${chapter?._id}|${marks}|${tag}|${hideUsed}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  useEffect(() => {
    if (resetKey === lastResetKey) return;
    setLastResetKey(resetKey);
    if (page > 1) router.replace(limit === 50 ? pathname : `${pathname}?limit=${limit}`, { scroll: false });
    document.getElementById("question-pane")?.scrollTo({ top: 0 });
  }, [resetKey, lastResetKey, page, limit, router, pathname]);

  // ---- Draft: kept on this device until saved, restored automatically ----
  // One per paper ("new" for an unsaved one), so editing a saved paper is
  // protected too
  const draftKey = `${DRAFT_KEY}:${defaultPaper?._id ?? "new"}`;
  const [restored, setRestored] = useState<number | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    // The first version kept one unkeyed draft: carry it over once
    let d = readDraft(draftKey);
    if (!d && !editing) {
      d = readDraft(DRAFT_KEY);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
    }
    if (d) {
      setSelected(d.questions);
      if (!editing) {
        if (d.course) setCourse(d.course);
        if (d.subject) setSubject(d.subject);
        if (d.book) setBook(d.book);
        if (d.chapter) setChapterId(d.chapter);
      }
      setRestored(d.savedAt);
    }
    setDraftReady(true);
    // Once, on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const savedIds = useMemo(() => (defaultPaper?.questions ?? []).map((q) => q._id).join(","), [defaultPaper]);
  useEffect(() => {
    // Not before the restore above, or the empty start would overwrite it
    if (!draftReady) return;
    try {
      const unchanged = editing ? selected.map((q) => q._id).join(",") === savedIds : selected.length === 0;
      if (unchanged) localStorage.removeItem(draftKey);
      else {
        const value: TDraft = { course, subject, book, chapter: chapterId, questions: selected, savedAt: Date.now() };
        localStorage.setItem(draftKey, JSON.stringify(value));
      }
    } catch {}
  }, [draftReady, draftKey, editing, savedIds, selected, course, subject, book, chapterId]);

  const discardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setSelected(defaultPaper?.questions ?? []);
    setRestored(null);
  };
  const clearDraftAfterSave = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setRestored(null);
  };

  // ---- Picking ------------------------------------------------------------------
  const toggle = useCallback(
    (q: TQuestion) => setSelected((prev) => (prev.some((x) => x._id === q._id) ? prev.filter((x) => x._id !== q._id) : [...prev, q])),
    []
  );
  const remove = useCallback((q: TQuestion) => setSelected((prev) => prev.filter((x) => x._id !== q._id)), []);
  const allOnPage = questions.length > 0 && questions.every((q) => selectedIds.has(q._id));
  const togglePage = () =>
    setSelected((prev) =>
      allOnPage ? prev.filter((x) => !questions.some((q) => q._id === x._id)) : [...prev, ...questions.filter((q) => !selectedIds.has(q._id))]
    );
  const [randomCount, setRandomCount] = useState("5");
  const unpicked = questions.filter((q) => !selectedIds.has(q._id));
  // N *new* questions: the old version could re-pick ones already in the paper
  const addRandom = () => {
    const n = Math.min(Number(randomCount) || 0, unpicked.length);
    if (!n) return;
    const pool = [...unpicked];
    const picked: TQuestion[] = [];
    for (let i = 0; i < n; i++) picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    setSelected((prev) => [...prev, ...picked]);
  };

  const pickedPerChapter = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of selected) {
      const id = chapterIdOf(q);
      if (id) map[id] = (map[id] ?? 0) + 1;
    }
    return map;
  }, [selected]);

  const onAction = useCallback((q: TQuestion, kind: TQuestionAction) => setAction({ q, kind }), []);

  // ---- Pieces ---------------------------------------------------------------------
  const sourcePickers = (
    <div className="grid grid-cols-2 gap-2">
      <SelectCompact
        placeholder="Class"
        value={course}
        onChange={setCourse}
        options={courses.map((c) => ({ label: courseLabel(c), value: c }))}
        className="min-w-0"
      />
      <SelectCompact
        placeholder="Subject"
        value={subject}
        onChange={setSubject}
        options={(subjects ?? []).map((s) => ({ label: s, value: s }))}
        className="min-w-0"
      />
      <SelectCompact
        placeholder="Book"
        value={book}
        onChange={setBook}
        options={books.map((b) => ({ label: b.title, value: b._id }))}
        emptyState="No books for this subject"
        loading={booksLoading}
        className="col-span-2 min-w-0"
      />
    </div>
  );

  const filters = (
    <>
      <SelectCompact
        placeholder="Any marks"
        value={marks}
        onChange={setMarks}
        options={MARKS.map((m) => ({ label: `${m} mark${m === 1 ? "" : "s"}`, value: String(m) }))}
        canUnselect
        className="min-w-0 lg:w-[7.5rem]"
      />
      <SelectCompact
        placeholder="Any tag"
        value={tag}
        onChange={setTag}
        options={TAGS.map((t) => ({ label: t, value: t }))}
        canUnselect
        className="min-w-0 lg:w-[7.5rem]"
      />
      <Pill on={hideUsed} onClick={() => setHideUsed((v) => !v)}>
        <HistoryIcon className="size-4" /> Unused
      </Pill>
    </>
  );

  const quickPick = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="h-10 gap-1.5"
        onClick={togglePage}
        disabled={!questions.length}
        title={allOnPage ? "Remove this page's questions from the paper" : "Add every question on this page to the paper"}
      >
        <CheckCheckIcon className="size-4" />
        {allOnPage ? `Remove all ${questions.length}` : `Add all ${questions.length}`}
      </Button>
      <div className="flex h-10 items-center rounded-md border bg-background">
        <Input
          aria-label="How many random questions"
          inputMode="numeric"
          value={randomCount}
          onChange={(e) => setRandomCount(e.target.value.replace(/\D/g, "").slice(0, 3))}
          className="h-full w-12 border-0 px-2 text-center text-base tabular-nums focus-visible:ring-0 sm:text-sm"
        />
        <Button
          variant="ghost"
          className="h-full gap-1.5 rounded-l-none border-l px-2.5"
          onClick={addRandom}
          disabled={!unpicked.length || !Number(randomCount)}
          title="Add this many random questions from this page"
        >
          <ShuffleIcon className="size-4" /> Random
        </Button>
      </div>
    </div>
  );

  const pager =
    totalPages > 1 ? (
      <div className="flex items-center gap-1">
        <Button variant="ghost" className="size-9 p-0" aria-label="Previous page" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">
          {page}/{totalPages}
        </span>
        <Button variant="ghost" className="size-9 p-0" aria-label="Next page" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    ) : null;

  const layoutToggle = (
    <div role="group" aria-label="Print layout" className="flex rounded-lg border bg-muted p-0.5">
      {[
        { two: false, label: "1 column", Icon: RectangleVerticalIcon },
        { two: true, label: "2 columns", Icon: Columns2Icon },
      ].map(({ two, label, Icon }) => (
        <button
          key={label}
          type="button"
          aria-pressed={twoColumn === two}
          onClick={() => setTwoColumn(two)}
          className={cn(
            "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
            twoColumn === two && "bg-card text-foreground shadow-sm"
          )}
        >
          <Icon className="size-4" aria-hidden="true" /> {label}
        </button>
      ))}
    </div>
  );

  const printButton = (className?: string) => (
    <Print>
      <PrintTrigger
        className={cn(buttonVariants({ variant: "brand" }), "h-11 gap-2", className)}
        disabled={selected.length === 0}
        onClick={() => startTransition(() => updateUsage(selected))}
      >
        <PrinterIcon className="size-4" /> Print
      </PrintTrigger>
      <PrintContent>
        <PaperFrame questions={selected} twoColumn={twoColumn} course={course} subject={subject} />
      </PrintContent>
    </Print>
  );

  const paperActions = (
    <div className="space-y-2">
      {layoutToggle}
      <div className="grid grid-cols-3 gap-2">
        <SavePaperButton
          id={defaultPaper?._id}
          defaultTitle={defaultPaper?.title}
          defaultAuthor={defaultPaper?.author || author}
          questions={selected}
          onSaved={clearDraftAfterSave}
          className="h-11 px-2"
        />
        <PreviewButtonV2
          questions={selected}
          onPrint={() => updateUsage(selected)}
          defaultTwoColumn={twoColumn}
          onQuestionRemove={remove}
          editable
          className="h-11 px-2"
        />
        {printButton("px-2")}
      </div>
    </div>
  );

  const summary = (
    <>
      <span className="font-bold tabular-nums">{selected.length}</span> question{selected.length === 1 ? "" : "s"} ·{" "}
      <span className="font-bold tabular-nums">{totalMarks}</span> marks
    </>
  );

  const questionList = () => {
    if (!book && !booksLoading) {
      return <Empty title="No books for this subject" text="Add a book and its chapters first." />;
    }
    if (loading && questions.length === 0) {
      return (
        <div className="space-y-3" aria-busy="true" aria-label="Loading questions">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      );
    }
    if (questions.length === 0) {
      return (
        <Empty
          title={filterCount ? "No questions match the filters" : "No questions in this chapter"}
          text={filterCount ? "Try another mark or tag, or show used questions too." : "Pick another chapter, or upload questions to this one."}
          action={
            filterCount ? (
              <Button
                variant="outline"
                onClick={() => {
                  setMarks("");
                  setTag("");
                  setHideUsed(false);
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      );
    }
    return (
      <>
        <ol className={cn("grid items-start gap-2 transition-opacity xl:grid-cols-2", loading && "opacity-60")}>
          {questions.map((q, i) => (
            <QuestionCard key={q._id} question={q} number={lastIndex + i + 1} selected={selectedIds.has(q._id)} onToggle={toggle} onAction={onAction} />
          ))}
        </ol>
        {pager && <div className="flex justify-center pt-4">{pager}</div>}
      </>
    );
  };

  // "1M×5 2M×3": the paper's shape at a glance
  const breakdown = useMemo(() => {
    const map = new Map<number, number>();
    for (const q of selected) map.set(q.mark || 0, (map.get(q.mark || 0) ?? 0) + 1);
    return Array.from(map.entries()).sort((x, y) => x[0] - y[0]);
  }, [selected]);

  return (
    <div className="lg:grid lg:h-[calc(100dvh-var(--app-header-h)-1px)] lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]">
      {/* ---------- Left: source + chapters (desktop) ---------- */}
      <aside className="hidden min-h-0 flex-col border-r bg-card lg:flex" aria-label="Chapters">
        <div className="space-y-2 border-b p-3">{sourcePickers}</div>
        <h2 className="px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Chapters</h2>
        <ChapterList chapters={chapters} loading={chaptersLoading || booksLoading} selectedId={chapterId} picked={pickedPerChapter} onSelect={(c) => setChapterId(c._id)} className="flex-1" />
      </aside>

      {/* ---------- Questions ---------- */}
      <section className="min-w-0 lg:flex lg:min-h-0 lg:flex-col" aria-label="Questions">
        {/* Phone bar: chapter switcher + filters, sticky under the app header */}
        <div className="sticky top-[var(--app-header-h)] z-10 flex items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setChaptersOpen(true)}
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-card px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {chapter ? `${chapters.indexOf(chapter) + 1}. ${chapter.title}` : "Choose a chapter"}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {courseLabel(course)} · {subject}
                {totalQuestions ? ` · ${totalQuestions} questions` : ""}
              </span>
            </span>
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
          <Button variant="outline" className="relative h-11 gap-1.5 px-3" onClick={() => setFiltersOpen(true)} aria-label="Filters and quick pick">
            <SlidersHorizontalIcon className="size-4" />
            {filterCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground">
                {filterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Desktop toolbar: one row */}
        <div className="hidden flex-wrap items-center gap-2 border-b bg-background px-4 py-2 lg:flex">
          <h1 className="mr-auto min-w-0 max-w-[16rem] truncate font-bold xl:max-w-sm" title={chapter?.title}>
            {chapter ? chapter.title : "Choose a chapter"}
            {totalQuestions ? <span className="ml-2 text-sm font-normal text-muted-foreground">{totalQuestions}</span> : null}
          </h1>
          {filters}
          {quickPick}
          {pager}
          <Button variant="ghost" className="size-9 p-0" aria-label="Refresh questions" onClick={() => refresh()} disabled={!chapter}>
            <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </div>

        <div id="question-pane" className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {restored && (
            <div className="mx-3 mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft px-3 py-2 lg:mx-4">
              <FileTextIcon className="size-4 shrink-0 text-brand" />
              <p className="min-w-0 flex-1 text-sm">
                Unsaved {editing ? "changes" : "paper"} restored · {ago(restored)}
              </p>
              <Button variant="ghost" className="h-8 px-2" onClick={discardDraft}>
                {editing ? "Discard changes" : "Start new"}
              </Button>
              <Button variant="ghost" className="size-8 p-0" aria-label="Dismiss" onClick={() => setRestored(null)}>
                <XIcon className="size-4" />
              </Button>
            </div>
          )}
          <div className="p-3 pb-28 lg:p-4">{questionList()}</div>
        </div>

        {/* Desktop paper bar */}
        <div className="hidden items-center gap-3 border-t bg-card px-4 py-2.5 lg:flex">
          <button
            type="button"
            onClick={() => setTrayOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <FileTextIcon className="size-5 shrink-0 text-brand" />
            <span className="shrink-0 text-sm">{summary}</span>
            <span className="flex min-w-0 gap-1 overflow-hidden">
              {breakdown.map(([m, n]) => (
                <span key={m} className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums">
                  {m}M×{n}
                </span>
              ))}
            </span>
          </button>
          <Button variant="outline" className="h-10 gap-1.5" onClick={() => setTrayOpen(true)} disabled={!selected.length}>
            <ListIcon className="size-4" /> Review
          </Button>
          <SavePaperButton
            id={defaultPaper?._id}
            defaultTitle={defaultPaper?.title}
            defaultAuthor={defaultPaper?.author || author}
            questions={selected}
            onSaved={clearDraftAfterSave}
            className="h-10"
          />
          <PreviewButtonV2
            questions={selected}
            onPrint={() => updateUsage(selected)}
            defaultTwoColumn={twoColumn}
            onQuestionRemove={remove}
            editable
            className="h-10"
          />
          {printButton("h-10 px-5")}
        </div>
      </section>

      {/* ---------- Phone: paper bar ---------- */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTrayOpen(true)}
            className="flex h-11 min-w-0 flex-1 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <FileTextIcon className="size-4 shrink-0 text-brand" />
            {/* Short form so Save and Print fit beside it on a phone */}
            <span className="min-w-0 flex-1 truncate">
              <span className="font-bold tabular-nums">{selected.length}</span> Q ·{" "}
              <span className="font-bold tabular-nums">{totalMarks}</span> marks
            </span>
            <ChevronDownIcon className="size-4 shrink-0 rotate-180 text-muted-foreground" />
          </button>
          {/* Save secondary, Print primary, side by side */}
          <SavePaperButton
            id={defaultPaper?._id}
            defaultTitle={defaultPaper?.title}
            defaultAuthor={defaultPaper?.author || author}
            questions={selected}
            onSaved={clearDraftAfterSave}
            className="h-11 px-3"
          />
          {printButton("px-3")}
        </div>
      </div>

      {/* ---------- Panels ---------- */}
      <ResponsiveDrawer open={chaptersOpen} onOpenChange={setChaptersOpen} title="Chapters" description={`${courseLabel(course)} · ${subject}`}>
        <div className="space-y-3 pt-3">
          <div className="px-3">{sourcePickers}</div>
          <ChapterList
            chapters={chapters}
            loading={chaptersLoading || booksLoading}
            selectedId={chapterId}
            picked={pickedPerChapter}
            onSelect={(c) => {
              setChapterId(c._id);
              setChaptersOpen(false);
            }}
          />
        </div>
      </ResponsiveDrawer>

      <ResponsiveDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filters & quick pick"
        footer={
          <Button variant="brand" className="h-11 w-full" onClick={() => setFiltersOpen(false)}>
            Show {totalQuestions} questions
          </Button>
        }
      >
        <div className="space-y-5 p-4">
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filter</h3>
            <div className="grid grid-cols-2 gap-2 [&>button]:col-span-2">{filters}</div>
          </section>
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick pick from this page</h3>
            {quickPick}
          </section>
          <Button variant="ghost" className="h-10 gap-2" onClick={() => refresh()} disabled={!chapter}>
            <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} /> Reload questions
          </Button>
        </div>
      </ResponsiveDrawer>

      <ResponsiveDrawer
        open={trayOpen}
        onOpenChange={setTrayOpen}
        title={editing ? defaultPaper?.title || "Paper" : "Your paper"}
        description={summary}
        footer={paperActions}
      >
        <PaperTray questions={selected} onRemove={remove} onClear={() => setSelected([])} />
      </ResponsiveDrawer>

      {/* ---------- Question edits (from the ⋯ menu) ---------- */}
      {action && action.kind !== "tags" && (
        <EditMarkdownSheet
          key={`${action.q._id}-${action.kind}`}
          open
          onOpenChange={(o) => !o && setAction(undefined)}
          text={action.kind === "question" ? action.q.text : action.q.ans}
          onSave={(text) => {
            updateQuestion(action.kind === "question" ? { id: action.q._id, text } : { id: action.q._id, ans: text });
            // The paper keeps its own copies: update the one there too
            setSelected((prev) =>
              prev.map((x) => (x._id === action.q._id ? { ...x, [action.kind === "question" ? "text" : "ans"]: text } : x))
            );
            setAction(undefined);
          }}
        />
      )}
      {action?.kind === "tags" && (
        <AddTagSheet
          key={`${action.q._id}-tags`}
          open
          onOpenChange={(o) => !o && setAction(undefined)}
          questionId={action.q._id}
          tags={action.q.tags}
          onSaved={() => refresh()}
        />
      )}
    </div>
  );
}

const Empty = ({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card px-6 py-14 text-center">
    <InboxIcon className="size-10 text-muted-foreground" strokeWidth={1.5} />
    <p className="font-semibold">{title}</p>
    <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
    {action}
  </div>
);
