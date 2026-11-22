"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CheckCircle2Icon, ChevronDownIcon, FileJsonIcon, Loader2Icon, TriangleAlertIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Checkbox } from "@/components/ui/checkbox";
import SelectCompact from "@/components/ui/select-compact";
import Markdown from "@/components/ui/markdown";
import { useCourses } from "@/hooks/useCourses";
import useBooks from "@/hooks/useBooks";
import useChapters from "@/hooks/useChapters";
import { uploadQuestionsInBatch } from "@/service/core.service";
import { nameKey } from "@/lib/pdfPages";
import { apiErrorMsg, cn } from "@/lib/utils";
import { TAG } from "@/data/const";
import type { TQuestion } from "@/models/Question";

/* The file made by the "Export questions" bookmarklet (scripts/bookmarklets/competishun-export.js) */
type TImported = {
  n: number;
  type: "MCQ" | "NUMERICAL";
  difficulty?: string;
  source?: string;
  text: string;
  answerKey?: string;
  keySource?: "stated" | "option" | "result" | "";
  solution?: string;
};
type TImportFile = { format: string; subject?: string; chapter?: string; count?: number; questions: TImported[] };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "JEE Main 220721_S2" -> "JEE Main 2021 (22 Jul, Shift 2)"; anything else as it is. */
const sourceLabel = (s?: string) => {
  if (!s) return "";
  const m = s.match(/JEE[\s_-]*Main[\s_-]*(\d{2})(\d{2})(\d{2})[\s_-]*S(\d)/i);
  if (!m) return s.replace(/_/g, " ");
  const [, dd, mm, yy, shift] = m;
  return `JEE Main 20${yy} (${Number(dd)} ${MONTHS[Number(mm) - 1] ?? mm}, Shift ${shift})`;
};
/* Images embedded as data: text would be stored inside the question (often 50-200 KB each);
   until image copying is built they are left out of what is uploaded. */
const DATA_IMG = /!\[[^\]]*\]\(data:[^)]*\)/g;
const countDataImages = (s?: string) => (s?.match(DATA_IMG) ?? []).length;

const KEY_LABEL: Record<string, { text: string; tone: string }> = {
  stated: { text: "Answer stated in the solution", tone: "text-green-700" },
  option: { text: "Answer matched from the solution's result: check", tone: "text-amber-800" },
  result: { text: "Answer taken from the solution's last line: check", tone: "text-amber-800" },
  edited: { text: "Answer set by you", tone: "text-green-700" },
  "": { text: "No answer found: enter it", tone: "text-red-700" },
};

type TRow = TImported & { include: boolean; key: string; keyFrom: string };

/** One imported question: rendered as it will be saved, with its answer to confirm or enter. */
function QuestionCard({ q, onChange }: { q: TRow; onChange: (p: Partial<TRow>) => void }) {
  const [showSolution, setShowSolution] = useState(false);
  const label = KEY_LABEL[q.keyFrom] ?? KEY_LABEL[""];
  const dropped = countDataImages(q.text) + countDataImages(q.solution);
  return (
    <li className={cn("space-y-3 rounded-2xl border bg-card p-4", !q.include && "opacity-60")}>
      <div className="flex items-start gap-3">
        <Checkbox checked={q.include} onCheckedChange={(v) => onChange({ include: v === true })} className="mt-1" aria-label={`Include question ${q.n}`} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="text-sm font-semibold text-foreground">Q{q.n}</span>
            <span>{q.type === "NUMERICAL" ? "Numerical" : "MCQ"}</span>
            {q.difficulty && <span>· {q.difficulty}</span>}
            {q.source && <span>· {sourceLabel(q.source)}</span>}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto text-sm">
        <Markdown text={q.text.replace(DATA_IMG, "")} />
      </div>

      <div className="space-y-2 rounded-xl bg-muted/50 p-3">
        <p className={cn("flex items-center gap-1.5 text-xs font-medium", label.tone)}>
          {q.key && q.keyFrom !== "option" && q.keyFrom !== "result" ? <CheckCircle2Icon className="size-3.5" aria-hidden="true" /> : <TriangleAlertIcon className="size-3.5" aria-hidden="true" />}
          {label.text}
        </p>
        {q.type === "MCQ" ? (
          <div role="radiogroup" aria-label={`Answer for question ${q.n}`} className="grid grid-cols-4 gap-1.5">
            {["a", "b", "c", "d"].map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={q.key === l}
                onClick={() => onChange({ key: l, keyFrom: "edited" })}
                className={cn("h-11 rounded-lg border text-sm font-semibold uppercase", q.key === l ? "border-brand bg-brand text-white" : "bg-background")}
              >
                {l}
              </button>
            ))}
          </div>
        ) : (
          <input
            value={q.key}
            onChange={(e) => onChange({ key: e.target.value.trim(), keyFrom: "edited" })}
            inputMode="decimal"
            placeholder="Answer"
            aria-label={`Answer for question ${q.n}`}
            className="h-11 w-40 rounded-lg border bg-background px-3 text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        )}
        {q.solution && (
          <button type="button" onClick={() => setShowSolution((v) => !v)} aria-expanded={showSolution} className="flex h-9 items-center gap-1 text-xs font-medium text-brand">
            <ChevronDownIcon className={cn("size-4 transition-transform motion-reduce:transition-none", showSolution && "rotate-180")} aria-hidden="true" />
            {showSolution ? "Hide solution" : "Show solution"}
          </button>
        )}
        {showSolution && q.solution && (
          <div className="overflow-x-auto rounded-lg bg-background p-3 text-sm">
            <Markdown text={q.solution.replace(DATA_IMG, "")} />
          </div>
        )}
        {dropped > 0 && (
          <p className="text-xs text-muted-foreground">
            {dropped} embedded image{dropped === 1 ? "" : "s"} in the solution will be left out (image copying comes later).
          </p>
        )}
      </div>
    </li>
  );
}

// Pattern 3 - Form: open the JSON the bookmarklet downloaded, check each
// question and its answer, pick the chapter, upload the selected ones.
export default function ImportQuestionsPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<TImportFile | null>(null);
  const [rows, setRows] = useState<TRow[]>([]);
  const [addSource, setAddSource] = useState(true);
  const [marks, setMarks] = useState("4");
  const [uploading, setUploading] = useState(false);

  const { courses, subjects, course, subject, setCourse, setSubject } = useCourses();
  const [bookId, setBookId] = useState<string>();
  const [chapterId, setChapterId] = useState<string>();
  const { books, loading: booksLoading } = useBooks(subject, course);
  const { chapters, loading: chaptersLoading } = useChapters(subject, course, bookId);

  const open = async (f?: File) => {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text()) as TImportFile;
      if (!Array.isArray(data?.questions) || !String(data.format ?? "").startsWith("eplus-pyq-import")) throw new Error("This isn't a file from the Export questions bookmarklet");
      setFile(data);
      setRows(data.questions.map((q) => ({ ...q, include: true, key: q.answerKey ?? "", keyFrom: q.answerKey ? q.keySource || "stated" : "" })));
      if (data.subject && subjects?.includes(data.subject)) setSubject(data.subject);
      setChapterId(undefined);
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't read that file"));
    }
  };

  // Suggest the chapter whose name matches the file's chapter, once a book is picked
  const suggested = useMemo(() => {
    const want = nameKey(file?.chapter ?? "");
    return want ? (chapters ?? []).find((c) => nameKey(c.title) === want || nameKey(c.title).includes(want) || want.includes(nameKey(c.title))) : undefined;
  }, [chapters, file?.chapter]);
  const chapter = chapterId ?? suggested?._id;

  const included = rows.filter((r) => r.include);
  const missing = included.filter((r) => !r.key);
  const toCheck = included.filter((r) => r.key && (r.keyFrom === "option" || r.keyFrom === "result"));
  const ready = !!chapter && included.length > 0 && missing.length === 0 && !uploading;

  const upload = async () => {
    if (!ready || !chapter) return;
    setUploading(true);
    try {
      const questions = included.map((r) => {
        const source = addSource && r.source ? `\n\n[${sourceLabel(r.source)}]` : "";
        const keyLine = r.type === "MCQ" ? `(${r.key}\\)` : r.key;
        return {
          text: r.text.replace(DATA_IMG, "").trim() + source,
          ans: [keyLine, (r.solution ?? "").replace(DATA_IMG, "").trim()].filter(Boolean).join("\n\n"),
          chapter,
          mark: Number(marks) || 4,
          tags: r.type === "NUMERICAL" ? [TAG.NUMERICAL] : [],
        } as unknown as TQuestion;
      });
      await uploadQuestionsInBatch(questions);
      toast.success(`${questions.length} question${questions.length === 1 ? "" : "s"} added to the bank`);
      setRows((all) => all.map((r) => (r.include ? { ...r, include: false } : r)));
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't upload"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-32 pt-4 sm:px-6">
      <Link href="/upload" className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden="true" /> Upload
      </Link>
      <PageHeader icon={<FileJsonIcon />} title="Import questions" description="Open a file from the Export questions bookmarklet, check the answers, and add them to a chapter." />

      <section className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
        <div className="min-w-0 flex-1">
          {file ? (
            <>
              <p className="truncate font-semibold">
                {file.subject} · {file.chapter}
              </p>
              <p className="text-sm text-muted-foreground">
                {rows.length} questions · {rows.filter((r) => r.keyFrom === "stated").length} answers stated · {toCheck.length} to check · {rows.filter((r) => !r.key).length} to enter
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No file open yet.</p>
          )}
        </div>
        <Button variant={file ? "outline" : "brand"} className="h-11 gap-2" onClick={() => fileInput.current?.click()}>
          <FileJsonIcon className="size-4" /> {file ? "Open another" : "Open JSON file"}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            open(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </section>

      {file && (
        <>
          <section className="space-y-3 rounded-2xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Add to</h2>
            <div className="grid grid-cols-2 gap-2">
              <SelectCompact label="Course" options={courses.map((c) => ({ label: c, value: c }))} value={course} onChange={(v) => { setCourse(v); setBookId(undefined); setChapterId(undefined); }} />
              <SelectCompact label="Subject" options={(subjects ?? []).map((s) => ({ label: s, value: s }))} value={subject} onChange={(v) => { setSubject(v); setBookId(undefined); setChapterId(undefined); }} />
              <SelectCompact label="Book" placeholder="Choose" loading={booksLoading} options={books.map((b) => ({ label: b.title, value: b._id }))} value={bookId} onChange={(v) => { setBookId(v); setChapterId(undefined); }} />
              <SelectCompact label="Chapter" placeholder="Choose" loading={chaptersLoading} disabled={!bookId} options={(chapters ?? []).map((c) => ({ label: c.title, value: c._id }))} value={chapter} onChange={setChapterId} />
            </div>
            {suggested && !chapterId && <p className="text-xs text-muted-foreground">Chapter matched by name: {suggested.title}</p>}
            <div className="flex flex-wrap items-end gap-3">
              <SelectCompact label="Marks each" options={["1", "2", "3", "4", "5"].map((v) => ({ label: v, value: v }))} value={marks} onChange={setMarks} className="w-32" />
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={addSource} onCheckedChange={(v) => setAddSource(v === true)} />
                Add the exam and year to each question
              </label>
            </div>
          </section>

          <ul className="space-y-3">
            {rows.map((q, i) => (
              <QuestionCard key={q.n} q={q} onChange={(p) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...p } : r)))} />
            ))}
          </ul>
        </>
      )}

      {file && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <p className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground sm:block">
              {!chapter ? "Choose the chapter" : missing.length ? `${missing.length} answer${missing.length === 1 ? "" : "s"} to enter (or untick those questions)` : `${included.length} selected`}
            </p>
            <Button variant="brand" className="h-11 flex-1 gap-2 sm:flex-none" disabled={!ready} onClick={upload}>
              {uploading ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
              Upload {included.length || ""} question{included.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
