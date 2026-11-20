"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronDownIcon, Loader2Icon, MoonStarIcon, SearchIcon } from "lucide-react";
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

type Mode = "similar" | "topic";

const PER_QUESTION = ["1", "2", "3", "4"].map((v) => ({ label: `${v} per question`, value: v }));
const TOTALS = Array.from({ length: 10 }, (_, i) => String((i + 1) * 5)).map((v) => ({ label: `${v} questions`, value: v }));
const DIFFICULTY = [
  { label: "Same difficulty", value: "same" },
  { label: "Easier", value: "easier" },
  { label: "Harder", value: "harder" },
];

function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 rounded-lg border bg-muted p-0.5">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn("h-10 rounded-md text-sm font-medium", value === v ? "bg-background shadow-sm" : "text-muted-foreground")}
        >
          {text}
        </button>
      ))}
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

type Props = { open: boolean; onOpenChange: (open: boolean) => void; onCreated?: (id: string) => void };

/** Queue a "variants" request for tonight's run. */
export function NewAiRequestSheet({ open, onOpenChange, onCreated }: Props) {
  const { courses, subjects, course, subject, setCourse, setSubject } = useCourses();
  const [bookId, setBookId] = useState<string>();
  const [chapterId, setChapterId] = useState<string>();
  const { books, loading: booksLoading } = useBooks(subject, course);
  const { chapters, loading: chaptersLoading } = useChapters(subject, course, bookId);

  const [mode, setMode] = useState<Mode>("similar");
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [perQuestion, setPerQuestion] = useState("2");
  const [total, setTotal] = useState("10");
  const [difficulty, setDifficulty] = useState("same");
  const [questionType, setQuestionType] = useState("same");
  const [instructions, setInstructions] = useState("");
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickChapter = (id: string) => {
    setChapterId(id);
    setQuestionIds([]);
  };
  const expected = mode === "similar" ? questionIds.length * Number(perQuestion) : Number(total);
  const ready = !!chapterId && (mode === "similar" ? questionIds.length > 0 : topic.trim().length > 2);

  const submit = async () => {
    if (!ready || saving) return;
    setSaving(true);
    try {
      const res = await api.post("ai-requests", {
        type: "variants",
        chapterId,
        input: {
          mode,
          ...(mode === "similar" ? { questionIds, count: Number(perQuestion) } : { topic: topic.trim(), count: Number(total) }),
          difficulty,
          questionType: mode === "topic" && questionType === "same" ? "MCQ" : questionType,
          instructions: instructions.trim(),
        },
      });
      toast.success("Queued. Claude will work on it tonight.");
      onOpenChange(false);
      onCreated?.(res?.data?.data?.request?._id);
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't queue the request"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="New AI request"
      description="Claude writes the questions overnight. You review them before anything is added."
      footer={
        <Button variant="brand" className="h-11 w-full gap-2" disabled={!ready || saving} onClick={submit}>
          {saving ? <Loader2Icon className="size-4 animate-spin" /> : <MoonStarIcon className="size-4" />}
          {ready ? `Queue ${expected} question${expected === 1 ? "" : "s"} for tonight` : "Queue for tonight"}
        </Button>
      }
    >
      <div className="flex flex-col gap-5 p-4">
        <Segmented<Mode>
          label="What to make"
          value={mode}
          onChange={setMode}
          options={[
            ["similar", "Similar to questions"],
            ["topic", "From a topic"],
          ]}
        />

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{mode === "similar" ? "Questions to copy from" : "Chapter"}</h3>
          <p className="-mt-1 text-xs text-muted-foreground">Approved questions are added to this chapter.</p>
          <div className="grid grid-cols-2 gap-2">
            <SelectCompact label="Course" options={courses.map((c) => ({ label: c, value: c }))} value={course} onChange={(v) => { setCourse(v); setBookId(undefined); setChapterId(undefined); }} />
            <SelectCompact label="Subject" options={(subjects ?? []).map((s) => ({ label: s, value: s }))} value={subject} onChange={(v) => { setSubject(v); setBookId(undefined); setChapterId(undefined); }} />
            <SelectCompact label="Book" placeholder="Choose" loading={booksLoading} options={books.map((b) => ({ label: b.title, value: b._id }))} value={bookId} onChange={(v) => { setBookId(v); setChapterId(undefined); }} />
            <SelectCompact label="Chapter" placeholder="Choose" loading={chaptersLoading} disabled={!bookId} options={(chapters ?? []).map((c) => ({ label: c.title, value: c._id }))} value={chapterId} onChange={pickChapter} />
          </div>
        </section>

        {chapterId && mode === "similar" && <QuestionChooser chapterId={chapterId} value={questionIds} onChange={setQuestionIds} />}

        {mode === "topic" && (
          <section className="space-y-2">
            <label htmlFor="ai-topic" className="text-sm font-semibold">
              Topic
            </label>
            <Textarea
              id="ai-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="For example: electric field lines and their properties"
            />
          </section>
        )}

        <div className="grid grid-cols-2 gap-2">
          {mode === "similar" ? (
            <SelectCompact label="How many" options={PER_QUESTION} value={perQuestion} onChange={setPerQuestion} />
          ) : (
            <SelectCompact label="How many" options={TOTALS} value={total} onChange={setTotal} />
          )}
          <SelectCompact label="Difficulty" options={DIFFICULTY} value={difficulty} onChange={setDifficulty} />
        </div>

        {/* Rarely needed: kept out of the way */}
        <section>
          <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className="flex h-10 items-center gap-1.5 text-sm font-medium text-brand">
            <ChevronDownIcon className={cn("size-4 transition-transform", more && "rotate-180")} aria-hidden="true" />
            More options
          </button>
          {more && (
            <div className="mt-2 space-y-3">
              <SelectCompact
                label="Question type"
                options={[
                  ...(mode === "similar" ? [{ label: "Same as source", value: "same" }] : []),
                  { label: "MCQ", value: "MCQ" },
                  { label: "Numerical", value: "NUMERICAL" },
                ]}
                value={mode === "topic" && questionType === "same" ? "MCQ" : questionType}
                onChange={setQuestionType}
              />
              <div className="space-y-1">
                <label htmlFor="ai-notes" className="ml-1 text-xs font-medium">
                  Notes for Claude
                </label>
                <Textarea
                  id="ai-notes"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="For example: use real-life contexts, keep numbers small"
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </ResponsiveDrawer>
  );
}
