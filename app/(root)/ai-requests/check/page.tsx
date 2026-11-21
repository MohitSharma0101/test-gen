"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { ArrowLeftIcon, CheckCircle2Icon, ClipboardCheckIcon, FileUpIcon, Loader2Icon, MoonStarIcon, SearchIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { DatePicker, toDateKey } from "@/components/ui/date-picker";
import SelectCompact from "@/components/ui/select-compact";
import useBatches from "@/hooks/useBatches";
import useUsers from "@/hooks/useUsers";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/uploadImage";
import { nameKey, pdfToPageImages } from "@/lib/pdfPages";
import { apiErrorMsg, cn } from "@/lib/utils";
import { ROUTE_GROUPS } from "@/data/routes";
import { SUBJECT, SUBJECT_MAP } from "@/data/const";

type TPaperPick = { _id: string; title: string; course?: string; questions?: unknown[] };

// One student's sheet while it is being prepared
type TSheet = { status: "working" | "ready" | "error"; fileName: string; pages: string[]; done: number; total: number; error?: string };

const LANGUAGES: [string, string][] = [
  ["hinglish", "Hinglish"],
  ["english", "English"],
  ["hindi", "Hindi"],
];
const MAX_PAGES = 20;
const MAX_FILE_MB = 25;

/** Search the papers by title and pick one. */
function PaperPicker({ value, onChange }: { value?: TPaperPick; onChange: (p?: TPaperPick) => void }) {
  const [q, setQ] = useState("");
  const { data, isLoading } = useSWR(value ? null : ["papers-pick", q.trim()], async () =>
    ((await api.get("papers", { params: { q: q.trim() || undefined, limit: 8 } }))?.data?.data?.papers ?? []) as TPaperPick[]
  );
  if (value)
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{value.title}</p>
          <p className="text-xs text-muted-foreground">{value.questions?.length ?? 0} questions</p>
        </div>
        <Button variant="outline" className="h-10 shrink-0" onClick={() => onChange(undefined)}>
          Change
        </Button>
      </div>
    );
  return (
    <div className="rounded-xl border">
      <div className="relative border-b p-2">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search papers by title"
          aria-label="Search papers"
          className="h-10 w-full rounded-md border bg-background pl-8 pr-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
      </div>
      <ul className="max-h-64 overflow-y-auto p-1">
        {isLoading && <li className="p-3 text-sm text-muted-foreground">Loading…</li>}
        {(data ?? []).map((p) => (
          <li key={p._id}>
            <button type="button" onClick={() => onChange(p)} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted">
              <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{p.questions?.length ?? 0} Q</span>
            </button>
          </li>
        ))}
        {!isLoading && !data?.length && <li className="p-3 text-sm text-muted-foreground">No papers match</li>}
      </ul>
    </div>
  );
}

// Pattern 3 - Form: a test's details, then one answer sheet per student.
// Files are turned into page images and uploaded as soon as they are added,
// so queueing is instant; the runner marks them overnight.
export default function CheckAnswerSheetsPage() {
  const router = useRouter();
  // Arrived from "switch type" on another queued request: its name and prompt
  // carry over, and that request is replaced once this one is queued
  const params = useSearchParams();
  const replaceId = params.get("replace");
  const { batches } = useBatches();
  const [batchId, setBatchId] = useState<string>();
  const { users: students, loading: studentsLoading } = useUsers({ batchId, shouldLoad: !!batchId });
  const [paper, setPaper] = useState<TPaperPick>();
  const [name, setName] = useState(params.get("name") ?? "");
  const [date, setDate] = useState(toDateKey(new Date()));
  const [subject, setSubject] = useState<string>();
  const [language, setLanguage] = useState("hinglish");
  const [instructions, setInstructions] = useState(params.get("notes") ?? "");
  const [sheets, setSheets] = useState<Record<string, TSheet>>({});
  const [unmatched, setUnmatched] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const bulkInput = useRef<HTMLInputElement>(null);
  const oneInput = useRef<HTMLInputElement>(null);
  const [addingFor, setAddingFor] = useState<string>();

  const subjects = useMemo(() => (paper?.course && SUBJECT_MAP[paper.course]) || SUBJECT, [paper?.course]);
  const pickPaper = (p?: TPaperPick) => {
    setPaper(p);
    if (p && !name) setName(p.title);
  };

  const patch = (id: string, s: Partial<TSheet>) => setSheets((all) => ({ ...all, [id]: { ...all[id], ...s } as TSheet }));

  /** One student's file(s) → page images → uploaded. A PDF is one sheet; photos are one page each. */
  const prepare = async (studentId: string, files: File[]) => {
    const fileName = files.map((f) => f.name).join(", ");
    patch(studentId, { status: "working", fileName, pages: [], done: 0, total: 0, error: undefined });
    try {
      const pages: Blob[] = [];
      for (const f of files) {
        if (f.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`${f.name} is over ${MAX_FILE_MB} MB`);
        if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) pages.push(...(await pdfToPageImages(f, MAX_PAGES)));
        else if (f.type.startsWith("image/")) pages.push(f);
        else throw new Error(`${f.name} isn't a PDF or a photo`);
      }
      if (!pages.length) throw new Error("No pages found");
      if (pages.length > MAX_PAGES) throw new Error(`${pages.length} pages (max ${MAX_PAGES})`);
      patch(studentId, { total: pages.length });
      const urls: string[] = [];
      for (const p of pages) {
        urls.push(await uploadImage(p, { purpose: "answer-sheet" }));
        patch(studentId, { done: urls.length });
      }
      patch(studentId, { status: "ready", pages: urls });
    } catch (err) {
      patch(studentId, { status: "error", error: apiErrorMsg(err, "Couldn't read this file") });
    }
  };

  /** Many PDFs at once: match each to a student by file name; the rest wait for a manual pick. */
  const addBulk = async (files: File[]) => {
    const byKey = new Map(students.map((s) => [nameKey(s.name), String(s._id)]));
    const left: File[] = [];
    const jobs: [string, File][] = [];
    for (const f of files) {
      const key = nameKey(f.name);
      const exact = byKey.get(key);
      const loose = exact ?? students.find((s) => key && (key.includes(nameKey(s.name)) || nameKey(s.name).includes(key)))?._id;
      if (loose) jobs.push([String(loose), f]);
      else left.push(f);
    }
    setUnmatched((u) => [...u, ...left]);
    // Two at a time: fast, without choking a phone's upload
    let i = 0;
    const worker = async () => {
      while (i < jobs.length) {
        const [id, f] = jobs[i++];
        await prepare(id, [f]);
      }
    };
    await Promise.all([worker(), worker()]);
  };

  const ready = Object.entries(sheets).filter(([, s]) => s.status === "ready");
  const busy = Object.values(sheets).some((s) => s.status === "working");
  const canQueue = !!batchId && !!paper && !!name.trim() && !!date && !!subject && ready.length > 0 && !busy && !saving;

  const queue = async () => {
    if (!canQueue) return;
    setSaving(true);
    try {
      const res = await api.post("ai-requests", {
        type: "check",
        input: {
          paper: paper!._id,
          batch: batchId,
          name: name.trim(),
          subject,
          date,
          language,
          instructions: instructions.trim(),
          sheets: ready.map(([student, s]) => ({ student, pages: s.pages })),
        },
      });
      if (replaceId) await api.delete(`ai-requests/${replaceId}`).catch(() => toast.error("The old request couldn't be removed; delete it from the list"));
      toast.success("Queued. Claude will check them tonight.");
      router.replace(`/ai-requests/${res?.data?.data?.request?._id ?? ""}`);
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't queue the check"));
      setSaving(false);
    }
  };

  const statusText = (s?: TSheet) => {
    if (!s) return <span className="text-muted-foreground">Not added</span>;
    if (s.status === "working")
      return (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
          {s.total ? `Uploading ${s.done} of ${s.total}` : "Reading…"}
        </span>
      );
    if (s.status === "error")
      return (
        <span className="inline-flex items-center gap-1.5 text-red-700">
          <TriangleAlertIcon className="size-3.5" aria-hidden="true" /> {s.error}
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 text-green-700">
        <CheckCircle2Icon className="size-3.5" aria-hidden="true" /> {s.pages.length} page{s.pages.length === 1 ? "" : "s"}
      </span>
    );
  };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-28 pt-4 sm:px-6">
      <Link href="/ai-requests" className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden="true" /> AI requests
      </Link>
      <PageHeader
        icon={<ClipboardCheckIcon />}
        tone={ROUTE_GROUPS.bank.tile}
        title="Check answer sheets"
        description="Add each student's answer sheet. Claude checks them tonight; you review before results are published."
      />

      <section className="space-y-3 rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Test</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectCompact
            label="Batch"
            placeholder="Choose"
            options={batches.map((b) => ({ label: b.name, value: String(b._id) }))}
            value={batchId}
            onChange={(v) => {
              setBatchId(v);
              setSheets({});
              setUnmatched([]);
            }}
          />
          <DatePicker label="Exam date" value={date} onChange={setDate} />
        </div>
        <div className="space-y-1">
          <p className="ml-1 text-xs font-medium">Paper</p>
          <PaperPicker value={paper} onChange={pickPaper} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="check-name" className="ml-1 text-xs font-medium">
              Test name
            </label>
            <input
              id="check-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          </div>
          <SelectCompact label="Subject" placeholder="Choose" options={subjects.map((s) => ({ label: s, value: s }))} value={subject} onChange={setSubject} />
        </div>
        <div className="space-y-1">
          <p className="ml-1 text-xs font-medium">Feedback language</p>
          <div role="radiogroup" aria-label="Feedback language" className="grid grid-cols-3 rounded-lg border bg-muted p-0.5">
            {LANGUAGES.map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={language === v}
                onClick={() => setLanguage(v)}
                className={cn("h-11 rounded-md text-sm font-medium", language === v ? "bg-background shadow-sm" : "text-muted-foreground")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="check-notes" className="ml-1 text-xs font-medium">
            Marking notes <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            id="check-notes"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="For example: no negative marking, give step marks in proofs"
          />
        </div>
      </section>

      {batchId && (
        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">Answer sheets</h2>
              <p className="text-xs text-muted-foreground">One PDF per student. Name files after the student to match them automatically.</p>
            </div>
            <Button variant="outline" className="h-11 gap-2" onClick={() => bulkInput.current?.click()} disabled={studentsLoading}>
              <FileUpIcon className="size-4" /> Add PDFs
            </Button>
            <input
              ref={bulkInput}
              type="file"
              accept="application/pdf"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (files.length) addBulk(files);
              }}
            />
            <input
              ref={oneInput}
              type="file"
              accept="application/pdf,image/*"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (addingFor && files.length) prepare(addingFor, files);
              }}
            />
          </div>

          {unmatched.length > 0 && (
            <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">Choose the student for these files</p>
              {unmatched.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex flex-wrap items-end gap-2">
                  <p className="min-w-0 flex-1 basis-40 truncate pb-2.5 text-sm">{f.name}</p>
                  <SelectCompact
                    label="Student"
                    placeholder="Choose"
                    className="w-52"
                    options={students.map((s) => ({ label: s.name, value: String(s._id) }))}
                    onChange={(id) => {
                      setUnmatched((u) => u.filter((_, j) => j !== i));
                      prepare(id, [f]);
                    }}
                  />
                  <Button variant="ghost" size="icon" className="size-11" aria-label={`Skip ${f.name}`} onClick={() => setUnmatched((u) => u.filter((_, j) => j !== i))}>
                    <XIcon className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <ul className="divide-y rounded-xl border">
            {studentsLoading && <li className="p-3 text-sm text-muted-foreground">Loading students…</li>}
            {students.map((s) => {
              const id = String(s._id);
              const sheet = sheets[id];
              return (
                <li key={id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="truncate text-xs">{statusText(sheet)}</p>
                  </div>
                  {sheet?.status === "ready" || sheet?.status === "error" ? (
                    <Button
                      variant="ghost"
                      className="h-11 shrink-0"
                      onClick={() =>
                        setSheets((all) => {
                          const next = { ...all };
                          delete next[id];
                          return next;
                        })
                      }
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-11 shrink-0"
                      disabled={sheet?.status === "working"}
                      onClick={() => {
                        setAddingFor(id);
                        oneInput.current?.click();
                      }}
                    >
                      Add
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <p className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground sm:block">
            {ready.length} answer sheet{ready.length === 1 ? "" : "s"} ready{busy ? " · still uploading" : ""}
          </p>
          <Button variant="brand" className="h-11 flex-1 gap-2 sm:flex-none" disabled={!canQueue} onClick={queue}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : <MoonStarIcon className="size-4" />}
            Queue {ready.length || ""} for tonight
          </Button>
        </div>
      </div>
    </main>
  );
}
