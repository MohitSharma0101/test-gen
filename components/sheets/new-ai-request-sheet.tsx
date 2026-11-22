"use client";

import { useState } from "react";
import useSWR from "swr";
import { CheckIcon, Loader2Icon, MinusIcon, PlusIcon, MoonStarIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import SelectCompact from "@/components/ui/select-compact";
import Markdown from "@/components/ui/markdown";
import { useCourses } from "@/hooks/useCourses";
import useBooks from "@/hooks/useBooks";
import useChapters from "@/hooks/useChapters";
import { fetchQuestions } from "@/service/core.service";
import { api } from "@/lib/api";
import { apiErrorMsg, cn } from "@/lib/utils";
import type { TQuestion } from "@/models/Question";
import type { TVariantInput } from "@/models/AiRequest";
import { AI_TOPIC_MAX, SUBJECT_MAP } from "@/data/const";
import { CheckForm } from "@/components/ai-requests/check-form";
import { ChooseChapterSheet } from "@/components/sheets/choose-chapter-sheet";

type Mode = "similar" | "topic";

function Segmented<T extends string>({ value, onChange, options, label, showLabel }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string; showLabel?: boolean }) {
  const group = (
    <div role="radiogroup" aria-label={label} className="grid rounded-lg border bg-muted p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn("h-11 rounded-md text-sm font-medium", value === v ? "bg-background shadow-sm" : "text-muted-foreground")}
        >
          {text}
        </button>
      ))}
    </div>
  );
  if (!showLabel) return group;
  return (
    <div className="space-y-1">
      <p className="ml-1 text-xs font-medium" aria-hidden="true">
        {label}
      </p>
      {group}
    </div>
  );
}

/** 5 to 50 in steps of 5: two big buttons instead of a ten-item list. */
function CountStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const btn = "flex size-11 items-center justify-center rounded-md disabled:opacity-40 active:bg-background";
  return (
    <div className="space-y-1">
      <p className="ml-1 text-xs font-medium" id="ai-count-label">
        How many
      </p>
      <div className="flex items-center rounded-lg border bg-muted p-0.5" role="group" aria-labelledby="ai-count-label">
        <button type="button" className={btn} aria-label="5 fewer" disabled={value <= 5} onClick={() => onChange(Math.max(5, value - 5))}>
          <MinusIcon className="size-4" />
        </button>
        <span className="flex-1 text-center text-sm font-medium tabular-nums" aria-live="polite">
          {value} questions
        </span>
        <button type="button" className={btn} aria-label="5 more" disabled={value >= 50} onClick={() => onChange(Math.min(50, value + 5))}>
          <PlusIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Pick source questions of a chapter: rendered previews, search, checkboxes. */
function QuestionChooser({ chapterId, value, onChange }: { chapterId: string; value: string[]; onChange: (ids: string[]) => void }) {
  const { data, isLoading } = useSWR(["ai-source-questions", chapterId], async () => (await fetchQuestions(chapterId, 1, 200)).questions as TQuestion[]);
  const [query, setQuery] = useState("");
  const all = data ?? [];
  const q = query.trim().toLowerCase();
  const shown = q ? all.filter((x) => (x.text ?? "").toLowerCase().includes(q)) : all;
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="rounded-xl border">
      <div className="flex items-center gap-2 border-b p-2">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions"
            aria-label="Search questions"
            className="h-9 w-full rounded-md border bg-background pl-8 pr-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </div>
        <span className="shrink-0 px-1 text-xs tabular-nums text-muted-foreground">{value.length} chosen</span>
      </div>
      <ul className="max-h-80 space-y-1 overflow-y-auto overscroll-contain p-1">
        {isLoading
          ? [0, 1, 2].map((i) => (
              <li key={i} className="p-2">
                <Skeleton className="h-14 w-full" />
              </li>
            ))
          : shown.map((x) => {
              const id = String(x._id);
              const on = value.includes(id);
              return (
                <li key={id} className="defer-offscreen">
                  <label className={cn("flex cursor-pointer gap-3 rounded-lg p-2 text-sm", on ? "bg-brand-soft/60" : "hover:bg-muted")}>
                    <Checkbox checked={on} onCheckedChange={() => toggle(id)} className="mt-1" />
                    {/* Three lines are enough to recognise a question */}
                    <div className="line-clamp-3 min-w-0 flex-1 overflow-hidden [&_img]:hidden">
                      <Markdown text={x.text ?? ""} />
                    </div>
                  </label>
                </li>
              );
            })}
        {!isLoading && !shown.length && (
          <li className="p-4 text-center text-sm text-muted-foreground">{q ? "No questions match" : "No questions in this chapter yet"}</li>
        )}
      </ul>
    </div>
  );
}

type TFormType = "variants" | "paper" | "check";

/** A queued request being edited (any type; it can be switched to another). */
export type TAiRequestEdit = {
  id: string;
  type: "variants" | "paper" | "check";
  input: Record<string, any>;
  // variants: the chapter it is tied to
  chapterId?: string;
  chapterLabel?: string;
  course?: string;
  subject?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
  /** Type to start on for a new request */
  initialType?: TFormType;
  /** Edit this queued request instead of creating one */
  editing?: TAiRequestEdit;
  onSaved?: () => void;
};

/**
 * Fields every type understands, carried across when the type is switched:
 * the name (variants: topic; paper: name; check: test name), the prompt
 * (variants: prompt; paper: prompt; check: marking notes), course, subject.
 */
type TShared = { name: string; prompt: string; course?: string; subject?: string };

const sharedFrom = (e?: TAiRequestEdit): TShared => {
  const i = e?.input ?? {};
  return {
    name: i.topic ?? i.name ?? "",
    prompt: i.instructions ?? i.prompt ?? "",
    course: i.course ?? e?.course,
    subject: i.subjects?.[0] ?? i.subject ?? e?.subject,
  };
};

/** Queue a request for tonight's run, or edit / re-type one that is still queued. */
export function NewAiRequestSheet({ open, onOpenChange, ...rest }: Props) {
  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={rest.editing ? "Edit request" : "New AI request"}
      description={rest.editing ? "Change it, or switch its type, any time before Claude starts on it." : "Claude works on it overnight. You review the result before anything is used."}
    >
      {/* Mounted only while open, so an edit always starts from the saved request */}
      {open && <TypedForm onOpenChange={onOpenChange} {...rest} />}
    </ResponsiveDrawer>
  );
}

const TYPE_OPTIONS: [TFormType, string][] = [
  ["variants", "Questions"],
  ["paper", "Paper"],
  ["check", "Check sheets"],
];

function TypedForm(props: Omit<Props, "open">) {
  const { editing, initialType } = props;
  // A queued check opens on another tab: re-choosing "Check sheets" starts a fresh upload
  const [type, setType] = useState<TFormType>(editing && editing.type !== "check" ? editing.type : initialType ?? "variants");
  // Lifted so whatever was typed survives a switch between types
  const [shared, setShared] = useState<TShared>(() => sharedFrom(editing));
  const patch = (p: Partial<TShared>) => setShared((s) => ({ ...s, ...p }));


  return (
    <>
      <div className="px-4 pt-4">
        <Segmented<TFormType> label="Request type" value={type} onChange={setType} options={TYPE_OPTIONS} />
      </div>
      {type === "variants" ? (
        <RequestForm key="variants" {...props} shared={shared} setShared={patch} switched={!!editing && editing.type !== "variants"} />
      ) : type === "paper" ? (
        <PaperForm key="paper" {...props} shared={shared} setShared={patch} />
      ) : (
        <CheckForm
          key="check"
          inDrawer
          initialName={shared.name}
          initialNotes={shared.prompt}
          replaceId={editing?.id}
          onShared={(name, prompt) => patch({ name, prompt })}
          onQueued={() => props.onOpenChange(false)}
        />
      )}
    </>
  );
}

type FormProps = Omit<Props, "open" | "initialType"> & { shared: TShared; setShared: (p: Partial<TShared>) => void };

/** "paper": a prompt, a name, the course and its subjects. Claude picks the questions. */
function PaperForm({ onOpenChange, onCreated, editing, onSaved, shared, setShared }: FormProps) {
  const init = editing?.type === "paper" ? editing.input : undefined;
  const { courses, course, setCourse } = useCourses({ defaultCourse: shared.course });
  const allSubjects: string[] = SUBJECT_MAP[course] ?? [];
  const [picked, setPicked] = useState<string[]>(() => (init?.subjects as string[] | undefined) ?? (shared.subject ? [shared.subject] : []));
  // New questions by default; older requests without a source picked from the bank
  const [source, setSource] = useState<"write" | "bank">(init ? (init.source === "write" ? "write" : "bank") : "write");
  const subjects = picked.filter((x) => allSubjects.includes(x));
  const [saving, setSaving] = useState(false);
  const name = shared.name;
  const prompt = shared.prompt;
  const ready = name.trim().length >= 3 && name.trim().length <= AI_TOPIC_MAX && prompt.trim().length >= 10 && subjects.length > 0;

  const submit = async () => {
    if (!ready || saving) return;
    setSaving(true);
    try {
      const input = { name: name.trim(), prompt: prompt.trim(), course, subjects, source };
      if (editing) {
        await api.patch(`ai-requests/${editing.id}`, { type: "paper", input });
        toast.success(editing.type === "paper" ? "Request updated" : "Changed to Make a paper");
        onOpenChange(false);
        onSaved?.();
        return;
      }
      const res = await api.post("ai-requests", { type: "paper", input });
      toast.success("Queued. Claude will make the paper tonight.");
      onOpenChange(false);
      onCreated?.(res?.data?.data?.request?._id);
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't queue the request"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-5 p-4">
        <Segmented<"write" | "bank">
          label="Questions from"
          showLabel
          value={source}
          onChange={setSource}
          options={[
            ["write", "Write new"],
            ["bank", "Question bank"],
          ]}
        />
        <p className="-mt-3 text-xs text-muted-foreground">
          {source === "write"
            ? "Claude writes every question and checks each answer. They join the bank only when you save the paper."
            : "Claude picks existing questions, least used first."}
        </p>

        <section className="space-y-1">
          <label htmlFor="ai-paper-prompt" className="text-sm font-semibold">
            Prompt
          </label>
          <Textarea
            id="ai-paper-prompt"
            value={prompt}
            onChange={(e) => setShared({ prompt: e.target.value })}
            rows={6}
            maxLength={2000}
            placeholder={"Describe the paper. For example:\nJEE Main pattern, 25 questions per subject\nPhysics: rotation and electrostatics only\nMaths: no integration"}
          />
          <p className="text-xs text-muted-foreground">Name the exam (JEE Main, NEET, CBSE, RBSE) to follow its pattern, or give your own counts and marks.</p>
        </section>

        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="ai-paper-name" className="text-sm font-semibold">
              Paper name
            </label>
            <span className={cn("text-xs tabular-nums", name.length > AI_TOPIC_MAX ? "text-red-700" : "text-muted-foreground")} aria-live="polite">
              {name.length}/{AI_TOPIC_MAX}
            </span>
          </div>
          <input
            id="ai-paper-name"
            value={name}
            onChange={(e) => setShared({ name: e.target.value })}
            maxLength={AI_TOPIC_MAX}
            placeholder="For example: JEE Main mock 4"
            className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </section>

        <section className="space-y-2">
          <SelectCompact
            label="Course"
            options={courses.map((c) => ({ label: c, value: c }))}
            value={course}
            onChange={(v) => {
              setCourse(v);
              setShared({ course: v });
            }}
          />
          <div className="space-y-1">
            <p className="ml-1 text-xs font-medium" id="ai-paper-subjects">
              Subjects
            </p>
            <div role="group" aria-labelledby="ai-paper-subjects" className="flex flex-wrap gap-2">
              {allSubjects.map((sub) => {
                const on = subjects.includes(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPicked((p) => (on ? p.filter((x) => x !== sub) : [...p, sub]))}
                    className={cn("h-11 rounded-full border px-4 text-sm font-medium", on ? "border-brand bg-brand-soft text-brand" : "bg-background text-muted-foreground")}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
      <div className="sticky bottom-0 border-t bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <Button variant="brand" className="h-11 w-full gap-2" disabled={!ready || saving} onClick={submit}>
          {saving ? <Loader2Icon className="size-4 animate-spin" /> : editing ? <CheckIcon className="size-4" /> : <MoonStarIcon className="size-4" />}
          {editing ? "Save" : "Queue the paper for tonight"}
        </Button>
      </div>
    </>
  );
}

function RequestForm({ onOpenChange, onCreated, editing, onSaved, shared, setShared, switched }: FormProps & { switched: boolean }) {
  const init = editing?.type === "variants" ? (editing.input as TVariantInput) : undefined;
  const topic = shared.name;
  const setTopic = (v: string) => setShared({ name: v });
  const instructions = shared.prompt;
  const setInstructions = (v: string) => setShared({ prompt: v });
  const { courses, subjects, course, subject, setCourse, setSubject } = useCourses({ defaultCourse: shared.course, defaultSubject: shared.subject });
  const [bookId, setBookId] = useState<string>();
  // A request switched from another type has no chapter yet
  const fixedChapter = !switched && !!editing?.chapterId;
  const [chapterId, setChapterId] = useState<string | undefined>(fixedChapter ? editing?.chapterId : undefined);
  const { books, loading: booksLoading } = useBooks(subject, course);
  const { chapters, loading: chaptersLoading } = useChapters(subject, course, bookId);

  const [mode, setMode] = useState<Mode>(init?.mode ?? "topic");
  const [questionIds, setQuestionIds] = useState<string[]>(init?.questionIds ?? []);
  const [perQuestion, setPerQuestion] = useState(init?.mode === "similar" ? String(init.count) : "2");
  const [total, setTotal] = useState(init?.mode === "topic" ? String(init.count) : "10");
  const [difficulty, setDifficulty] = useState<string>(init?.difficulty ?? "same");
  const [questionType, setQuestionType] = useState<string>(init?.questionType ?? "same");
  const [saving, setSaving] = useState(false);

  const pickChapter = (id: string) => {
    setChapterId(id);
    setQuestionIds([]);
  };
  const expected = mode === "similar" ? questionIds.length * Number(perQuestion) : Number(total);
  // Topic requests pick their chapter last, in a drawer opened by the Queue button
  const chapterLast = mode === "topic" && !fixedChapter;
  const [choosingChapter, setChoosingChapter] = useState(false);
  const ready = (chapterLast || !!chapterId) && (mode === "similar" ? questionIds.length > 0 : topic.trim().length > 2 && topic.trim().length <= AI_TOPIC_MAX);

  const submit = async (pickedChapter?: string) => {
    const target = pickedChapter ?? chapterId;
    if (!ready || saving || !target) return;
    setSaving(true);
    try {
      const input = {
        mode,
        ...(mode === "similar" ? { questionIds, count: Number(perQuestion) } : { topic: topic.trim(), count: Number(total) }),
        difficulty,
        questionType: mode === "topic" && questionType === "same" ? "MCQ" : questionType,
        instructions: instructions.trim(),
      };
      if (editing) {
        await api.patch(`ai-requests/${editing.id}`, { type: "variants", input, chapterId: target });
        toast.success(switched ? "Changed to Write questions" : "Request updated");
        onOpenChange(false);
        onSaved?.();
        return;
      }
      const res = await api.post("ai-requests", { type: "variants", chapterId: target, input });
      toast.success("Queued. Claude will work on it tonight.");
      onOpenChange(false);
      onCreated?.(res?.data?.data?.request?._id);
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't queue the request"));
    } finally {
      setSaving(false);
    }
  };

  const label = editing
    ? `Save: ${expected} question${expected === 1 ? "" : "s"}`
    : ready
      ? `Queue ${expected} question${expected === 1 ? "" : "s"} for tonight`
      : "Queue for tonight";

  return (
    <>
      <div className="flex flex-col gap-5 p-4">
        <Segmented<Mode>
          label="What to make"
          value={mode}
          onChange={setMode}
          options={[
            ["topic", "From a topic"],
            ["similar", "Similar to questions"],
          ]}
        />

        {/* What staff actually want goes here; it leads the form so it isn't missed */}
        <section className="space-y-1">
          <label htmlFor="ai-prompt" className="text-sm font-semibold">
            Prompt <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            id="ai-prompt"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Tell Claude what you want. For example: JEE Main level, real-life contexts, mix easy and hard questions"
          />
        </section>

        {fixedChapter ? (
          <section className="space-y-1">
            <h3 className="text-sm font-semibold">Chapter</h3>
            <p className="text-sm text-muted-foreground">{editing?.chapterLabel}</p>
          </section>
        ) : chapterLast ? null : (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Questions to copy from</h3>
          <p className="-mt-1 text-xs text-muted-foreground">Pick the chapter, then the questions to copy from.</p>
          <div className="grid grid-cols-2 gap-2">
            <SelectCompact label="Course" options={courses.map((c) => ({ label: c, value: c }))} value={course} onChange={(v) => { setCourse(v); setBookId(undefined); setChapterId(undefined); }} />
            <SelectCompact label="Subject" options={(subjects ?? []).map((s) => ({ label: s, value: s }))} value={subject} onChange={(v) => { setSubject(v); setBookId(undefined); setChapterId(undefined); }} />
            <SelectCompact label="Book" placeholder="Choose" loading={booksLoading} options={books.map((b) => ({ label: b.title, value: b._id }))} value={bookId} onChange={(v) => { setBookId(v); setChapterId(undefined); }} />
            <SelectCompact label="Chapter" placeholder="Choose" loading={chaptersLoading} disabled={!bookId} options={(chapters ?? []).map((c) => ({ label: c.title, value: c._id }))} value={chapterId} onChange={pickChapter} />
          </div>
        </section>
        )}

        {chapterId && mode === "similar" && <QuestionChooser chapterId={chapterId} value={questionIds} onChange={setQuestionIds} />}

        {mode === "topic" && (
          <section className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="ai-topic" className="text-sm font-semibold">
                Topic
              </label>
              <span className={cn("text-xs tabular-nums", topic.length > AI_TOPIC_MAX ? "text-red-700" : "text-muted-foreground")} aria-live="polite">
                {topic.length}/{AI_TOPIC_MAX}
              </span>
            </div>
            <p className="-mt-1 text-xs text-muted-foreground">A short name for the request. Details go in the prompt.</p>
            <input
              id="ai-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={AI_TOPIC_MAX}
              placeholder="For example: Electric flux"
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          </section>
        )}

        <div className="flex flex-col gap-4">
          {mode === "similar" ? (
            <Segmented label="How many per question" showLabel value={perQuestion} onChange={setPerQuestion} options={["1", "2", "3", "4"].map((v) => [v, v] as [string, string])} />
          ) : (
            <CountStepper value={Number(total)} onChange={(v) => setTotal(String(v))} />
          )}
          <Segmented
            label="Difficulty"
            showLabel
            value={difficulty}
            onChange={setDifficulty}
            options={[
              ["same", mode === "similar" ? "Same" : "Usual"],
              ["easier", "Easier"],
              ["harder", "Harder"],
            ]}
          />
          <Segmented
            label="Question type"
            showLabel
            value={mode === "topic" && questionType === "same" ? "MCQ" : questionType}
            onChange={setQuestionType}
            options={[...(mode === "similar" ? [["same", "Same as source"] as [string, string]] : []), ["MCQ", "MCQ"], ["NUMERICAL", "Numerical"]]}
          />
        </div>
      </div>
      {/* Stays in reach while the form scrolls */}
      <div className="sticky bottom-0 border-t bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <Button variant="brand" className="h-11 w-full gap-2" disabled={!ready || saving} onClick={() => (chapterLast ? setChoosingChapter(true) : submit())}>
          {saving ? <Loader2Icon className="size-4 animate-spin" /> : editing ? <CheckIcon className="size-4" /> : <MoonStarIcon className="size-4" />}
          {label}
        </Button>
      </div>
      {chapterLast && (
        <ChooseChapterSheet
          open={choosingChapter}
          onOpenChange={setChoosingChapter}
          title="Which chapter?"
          description="Claude checks this chapter so it doesn’t repeat questions already there. You choose where to add them when you upload."
          initial={{ course, subject, bookId, chapterId }}
          confirmLabel={editing ? "Save" : `Queue ${expected} question${expected === 1 ? "" : "s"} for tonight`}
          confirmIcon={<MoonStarIcon className="size-4" />}
          onConfirm={async (id) => {
            setChapterId(id);
            await submit(id);
          }}
        />
      )}
    </>
  );
}
