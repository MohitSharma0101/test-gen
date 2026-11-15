"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon,
  RefreshCwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import AddTagSheet, { TAGS } from "@/components/sheets/add-tag-sheet";
import EditMarkdownSheet from "@/components/sheets/edit-markdown-sheet";
import ChapterList from "@/components/question-bank/chapter-list";
import QuestionCard, { TQuestionAction } from "@/components/question-bank/question-card";
import { Button } from "@/components/ui/button";
import DeleteButton from "@/components/ui/delete-button";
import { Input } from "@/components/ui/input";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import SelectCompact from "@/components/ui/select-compact";
import { Skeleton } from "@/components/ui/skeleton";
import { MARKS } from "@/data/const";
import useBooks from "@/hooks/useBooks";
import useChapters from "@/hooks/useChapters";
import { useCourses } from "@/hooks/useCourses";
import useQuestions from "@/hooks/useQuestions";
import { cn, courseLabel } from "@/lib/utils";
import type { TQuestion } from "@/models/Question";

// The question bank: browse a chapter, find one question by ID, edit text /
// answer / tags / marks, select and delete. Same layout as Create Paper.
export default function ManageQuestion() {
  const { course, subject, setCourse, setSubject, courses, subjects } = useCourses();
  const [book, setBook] = useState("");
  const { books, loading: booksLoading } = useBooks(subject, course);
  const { chapters: chapterData, loading: chaptersLoading } = useChapters(subject, course, book);
  const chapters = useMemo(() => chapterData ?? [], [chapterData]);
  const [chapterId, setChapterId] = useState("");
  const chapter = chapters.find((c) => c._id === chapterId);

  const [marks, setMarks] = useState("");
  const [tag, setTag] = useState("");
  // Looking up one question by its ID replaces the chapter list until cleared
  const [idQuery, setIdQuery] = useState("");
  const [questionId, setQuestionId] = useState("");
  const filterCount = [marks, tag].filter(Boolean).length;

  const {
    questions: questionData,
    loading,
    lastIndex,
    totalPages: pagesRaw,
    totalQuestions: totalRaw,
    deleteQuestions,
    refresh,
    updateQuestion,
  } = useQuestions(chapter?._id, marks, questionId || undefined, tag);
  const questions = useMemo(() => questionData ?? [], [questionData]);
  const totalPages = questionId ? 1 : Number(pagesRaw) || 0;
  const totalQuestions = questionId ? questions.length : Number(totalRaw) || 0;

  const [selected, setSelected] = useState<TQuestion[]>([]);
  const selectedIds = useMemo(() => new Set(selected.map((q) => q._id)), [selected]);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  // Page lives in the URL; a new chapter or filter starts at page 1
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 50);
  const goToPage = useCallback(
    (p: number) => router.push(p <= 1 && limit === 50 ? pathname : `${pathname}?page=${p}&limit=${limit}`, { scroll: false }),
    [router, pathname, limit]
  );
  const resetKey = `${chapter?._id}|${marks}|${tag}|${questionId}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  useEffect(() => {
    if (resetKey === lastResetKey) return;
    setLastResetKey(resetKey);
    // Selection belongs to what's on screen: deleting unseen questions is too easy otherwise
    setSelected([]);
    if (page > 1) router.replace(limit === 50 ? pathname : `${pathname}?limit=${limit}`, { scroll: false });
    document.getElementById("question-pane")?.scrollTo({ top: 0 });
  }, [resetKey, lastResetKey, page, limit, router, pathname]);

  const toggle = useCallback(
    (q: TQuestion) => setSelected((prev) => (prev.some((x) => x._id === q._id) ? prev.filter((x) => x._id !== q._id) : [...prev, q])),
    []
  );
  const allOnPage = questions.length > 0 && questions.every((q) => selectedIds.has(q._id));
  const togglePage = () =>
    setSelected((prev) =>
      allOnPage ? prev.filter((x) => !questions.some((q) => q._id === x._id)) : [...prev, ...questions.filter((q) => !selectedIds.has(q._id))]
    );
  const onAction = useCallback((q: TQuestion, kind: TQuestionAction) => setAction({ q, kind }), []);

  const findById = () => {
    const id = idQuery.trim();
    if (id) setQuestionId(id);
  };
  const clearSearch = () => {
    setIdQuery("");
    setQuestionId("");
  };

  // ---- Pieces ---------------------------------------------------------------
  const sourcePickers = (
    <div className="grid grid-cols-2 gap-2">
      <SelectCompact placeholder="Class" value={course} onChange={setCourse} options={courses.map((c) => ({ label: courseLabel(c), value: c }))} className="min-w-0" />
      <SelectCompact placeholder="Subject" value={subject} onChange={setSubject} options={(subjects ?? []).map((s) => ({ label: s, value: s }))} className="min-w-0" />
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
    </>
  );

  const idSearch = (
    <form
      className="relative min-w-0 lg:w-56"
      onSubmit={(e) => {
        e.preventDefault();
        findById();
      }}
    >
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label="Find a question by ID"
        placeholder="Find by question ID"
        value={idQuery}
        onChange={(e) => {
          setIdQuery(e.target.value);
          if (!e.target.value) setQuestionId("");
        }}
        className="h-10 pl-9 text-base sm:text-sm"
      />
    </form>
  );

  const selectPage = (
    <Button variant="outline" className="h-10 gap-1.5" onClick={togglePage} disabled={!questions.length}>
      <CheckCheckIcon className="size-4" />
      {allOnPage ? `Unselect all ${questions.length}` : `Select all ${questions.length}`}
    </Button>
  );

  const pager =
    !questionId && totalPages > 1 ? (
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

  const heading = questionId ? `Question ${questionId}` : chapter ? chapter.title : "Choose a chapter";

  const questionList = () => {
    if (!questionId && !book && !booksLoading) return <Empty title="No books for this subject" text="Add a book and its chapters first." />;
    if (loading && questions.length === 0) {
      return (
        <div className="space-y-2" aria-busy="true" aria-label="Loading questions">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      );
    }
    if (questions.length === 0) {
      return (
        <Empty
          title={questionId ? "No question with that ID" : filterCount ? "No questions match the filters" : "No questions in this chapter"}
          text={questionId ? "Check the ID and try again." : filterCount ? "Try another mark or tag." : "Upload questions to this chapter from the Upload page."}
          action={
            questionId ? (
              <Button variant="outline" onClick={clearSearch}>
                Back to the chapter
              </Button>
            ) : filterCount ? (
              <Button
                variant="outline"
                onClick={() => {
                  setMarks("");
                  setTag("");
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
            <QuestionCard
              key={q._id}
              question={q}
              number={questionId ? i + 1 : lastIndex + i + 1}
              selected={selectedIds.has(q._id)}
              onToggle={toggle}
              onAction={onAction}
              canChangeMarks
            />
          ))}
        </ol>
        {pager && <div className="flex justify-center pt-4">{pager}</div>}
      </>
    );
  };

  return (
    <div className="lg:grid lg:h-[calc(100dvh-var(--app-header-h)-1px)] lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]">
      {/* ---------- Left: source + chapters (desktop) ---------- */}
      <aside className="hidden min-h-0 flex-col border-r bg-card lg:flex" aria-label="Chapters">
        <div className="space-y-2 border-b p-3">{sourcePickers}</div>
        <h2 className="px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Chapters</h2>
        <ChapterList
          chapters={chapters}
          loading={chaptersLoading || booksLoading}
          selectedId={questionId ? undefined : chapterId}
          picked={{}}
          onSelect={(c) => {
            clearSearch();
            setChapterId(c._id);
          }}
          className="flex-1"
        />
      </aside>

      {/* ---------- Questions ---------- */}
      <section className="min-w-0 lg:flex lg:min-h-0 lg:flex-col" aria-label="Questions">
        {/* Phone bar */}
        <div className="sticky top-[var(--app-header-h)] z-10 flex items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setChaptersOpen(true)}
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-card px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {questionId ? heading : chapter ? `${chapters.indexOf(chapter) + 1}. ${chapter.title}` : "Choose a chapter"}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {courseLabel(course)} · {subject}
                {totalQuestions ? ` · ${totalQuestions} questions` : ""}
              </span>
            </span>
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
          <Button variant="outline" className="relative h-11 px-3" onClick={() => setFiltersOpen(true)} aria-label="Search and filters">
            <SlidersHorizontalIcon className="size-4" />
            {filterCount + (questionId ? 1 : 0) > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground">
                {filterCount + (questionId ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>

        {/* Desktop toolbar: one row */}
        <div className="hidden flex-wrap items-center gap-2 border-b bg-background px-4 py-2 lg:flex">
          <h1 className="mr-auto min-w-0 max-w-[16rem] truncate font-bold xl:max-w-sm" title={heading}>
            {heading}
            {!questionId && totalQuestions ? <span className="ml-2 text-sm font-normal text-muted-foreground">{totalQuestions}</span> : null}
          </h1>
          {idSearch}
          {!questionId && filters}
          {selectPage}
          {pager}
          <Button variant="ghost" className="size-9 p-0" aria-label="Refresh questions" onClick={() => refresh()} disabled={!chapter && !questionId}>
            <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </div>

        <div id="question-pane" className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {questionId && (
            <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft px-3 py-2 text-sm lg:mx-4">
              <SearchIcon className="size-4 shrink-0 text-brand" />
              <span className="min-w-0 flex-1 truncate">
                Showing question <strong>{questionId}</strong>
              </span>
              <Button variant="ghost" className="h-8 gap-1 px-2" onClick={clearSearch}>
                <XIcon className="size-4" /> Back to chapter
              </Button>
            </div>
          )}
          <div className={cn("p-3 lg:p-4", selected.length ? "pb-28" : "pb-12")}>{questionList()}</div>
        </div>
      </section>

      {/* ---------- Selection bar ---------- */}
      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur animate-in slide-in-from-bottom-4 motion-reduce:animate-none lg:left-64 xl:left-[17rem]">
          <div className="mx-auto flex max-w-5xl items-center gap-2">
            <Button variant="ghost" className="size-10 p-0" aria-label="Clear selection" onClick={() => setSelected([])}>
              <XIcon className="size-4" />
            </Button>
            <span className="flex-1 text-sm font-medium">{selected.length} selected</span>
            <DeleteButton
              size="default"
              className="h-11 gap-2"
              title={`Delete ${selected.length} question${selected.length === 1 ? "" : "s"}?`}
              description="They are removed from the question bank for good. This can't be undone."
              onDelete={(close) =>
                deleteQuestions(selected, () => {
                  close();
                  setSelected([]);
                })
              }
            >
              <Trash2Icon className="size-4" /> Delete {selected.length}
            </DeleteButton>
          </div>
        </div>
      )}

      {/* ---------- Phone panels ---------- */}
      <ResponsiveDrawer open={chaptersOpen} onOpenChange={setChaptersOpen} title="Chapters" description={`${courseLabel(course)} · ${subject}`}>
        <div className="space-y-3 pt-3">
          <div className="px-3">{sourcePickers}</div>
          <ChapterList
            chapters={chapters}
            loading={chaptersLoading || booksLoading}
            selectedId={questionId ? undefined : chapterId}
            picked={{}}
            onSelect={(c) => {
              clearSearch();
              setChapterId(c._id);
              setChaptersOpen(false);
            }}
          />
        </div>
      </ResponsiveDrawer>

      <ResponsiveDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Search & filters"
        footer={
          <Button variant="brand" className="h-11 w-full" onClick={() => setFiltersOpen(false)}>
            Show {totalQuestions} question{totalQuestions === 1 ? "" : "s"}
          </Button>
        }
      >
        <div className="space-y-5 p-4">
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Find by ID</h3>
            {idSearch}
          </section>
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filter</h3>
            <div className="grid grid-cols-2 gap-2">{filters}</div>
          </section>
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select</h3>
            {selectPage}
          </section>
          <Button variant="ghost" className="h-10 gap-2" onClick={() => refresh()} disabled={!chapter && !questionId}>
            <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} /> Reload questions
          </Button>
        </div>
      </ResponsiveDrawer>

      {/* ---------- Edits from the ⋯ menu ---------- */}
      {action && (action.kind === "question" || action.kind === "answer") && (
        <EditMarkdownSheet
          key={`${action.q._id}-${action.kind}`}
          open
          onOpenChange={(o) => !o && setAction(undefined)}
          title={action.kind === "question" ? "Edit question" : action.q.ans ? "Edit answer" : "Add answer"}
          text={action.kind === "question" ? action.q.text : action.q.ans}
          onSave={(text) => {
            updateQuestion(action.kind === "question" ? { id: action.q._id, text } : { id: action.q._id, ans: text });
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
      <ResponsiveDrawer
        open={action?.kind === "marks"}
        onOpenChange={(o) => !o && setAction(undefined)}
        title="Change marks"
        description={action?.kind === "marks" ? `Now ${action.q.mark ?? "?"} mark${action.q.mark === 1 ? "" : "s"}` : undefined}
      >
        <div role="radiogroup" aria-label="Marks" className="grid grid-cols-5 gap-2 p-4">
          {MARKS.map((m) => {
            const current = action?.kind === "marks" && action.q.mark === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={current}
                onClick={() => {
                  if (action && !current) updateQuestion({ id: action.q._id, mark: m });
                  setAction(undefined);
                }}
                className={cn(
                  "h-12 rounded-xl border text-base font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  current ? "border-brand bg-brand text-brand-foreground" : "bg-background hover:bg-muted"
                )}
              >
                {m}
              </button>
            );
          })}
        </div>
      </ResponsiveDrawer>
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
