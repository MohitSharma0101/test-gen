"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, FileTextIcon, FolderInputIcon, Loader2Icon, PencilIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PreviewButton from "@/components/ui/preview-button-v2";
import { ChooseChapterSheet } from "@/components/sheets/choose-chapter-sheet";
import { PaperNote } from "@/components/ai-requests/paper-note";
import type { TAiRequestDetail, TDraftChapter } from "@/hooks/useAiRequests";
import type { TPaperInput } from "@/models/AiRequest";
import type { TQuestion } from "@/models/Question";
import { api } from "@/lib/api";
import { apiErrorMsg, withConfirmation } from "@/lib/utils";

type Props = { id: string; request: TAiRequestDetail; chapters: TDraftChapter[]; onDiscard: () => void };

// A paper Claude wrote from scratch. Its questions wait in the request: the
// teacher previews the paper, checks where each group of questions will be
// saved (Claude chose; unsure picks are marked), and saves. Only then do the
// questions join the bank.
export function WrittenPaper({ id, request, chapters, onDiscard }: Props) {
  const router = useRouter();
  const input = request.input as unknown as TPaperInput;
  const [busy, setBusy] = useState<"save" | "edit" | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  const drafts = useMemo(() => [...request.drafts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [request.drafts]);
  const byId = useMemo(() => new Map(chapters.map((c) => [String(c._id), c])), [chapters]);
  const marks = drafts.reduce((t, d) => t + (Number(d.mark) || 1), 0);

  // The preview prints like any paper: chapter (with subject) decides the sections
  const asQuestions = useMemo(
    () =>
      drafts.map((d) => {
        const ch = byId.get(String(d.chapter));
        return { _id: d._id, text: d.text, ans: d.ans, mark: d.mark ?? 1, tags: [], chapter: ch ? { _id: ch._id, title: ch.title, subject: ch.subject } : undefined } as unknown as TQuestion;
      }),
    [drafts, byId]
  );

  // Where they'll go: one row per chapter, in paper order
  const groups = useMemo(() => {
    const map = new Map<string, { chapter?: TDraftChapter; ids: string[]; unsure: number }>();
    for (const d of drafts) {
      const key = String(d.chapter ?? "");
      const g = map.get(key) ?? { chapter: byId.get(key), ids: [], unsure: 0 };
      g.ids.push(String(d._id));
      if (d.chapterUnsure) g.unsure++;
      map.set(key, g);
    }
    return Array.from(map.entries());
  }, [drafts, byId]);
  const movingGroup = groups.find(([k]) => k === moving)?.[1];

  const save = async (status: "PUBLIC" | "DRAFT") => {
    setBusy(status === "DRAFT" ? "edit" : "save");
    try {
      const res = (await api.post(`ai-requests/${id}/save-paper`, { status }))?.data?.data;
      if (status === "DRAFT") router.replace(`/papers/edit/${res?.paper}`);
      else {
        toast.success(`Paper saved. ${res?.added ?? drafts.length} new questions added to the bank.`);
        router.replace("/papers");
      }
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't save the paper"));
      setBusy(null);
    }
  };

  const move = async (chapterId: string) => {
    if (!movingGroup) return;
    try {
      await api.patch(`ai-requests/${id}/drafts`, { draftIds: movingGroup.ids, chapter: chapterId });
      toast.success("Moved");
      setMoving(null);
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't move them"));
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand" aria-hidden="true">
          <FileTextIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{input.name}</p>
          <p className="text-sm text-muted-foreground">
            {drafts.length} new questions · {marks} marks · not in the bank until you save
          </p>
        </div>
      </div>

      {request.result?.note && <PaperNote note={request.result.note} />}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Where they&apos;ll be saved</p>
        <ul className="divide-y rounded-xl border">
          {groups.map(([key, g]) => (
            <li key={key} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{g.chapter?.title ?? "No chapter"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {g.ids.length} question{g.ids.length === 1 ? "" : "s"} · {g.chapter?.book?.title ?? ""} · {g.chapter?.subject ?? ""}
                </p>
                {g.unsure > 0 && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-800">
                    <TriangleAlertIcon className="size-3.5" aria-hidden="true" /> Claude wasn&apos;t sure about this chapter
                  </p>
                )}
              </div>
              <Button variant="outline" className="h-11 shrink-0 gap-1.5" onClick={() => setMoving(key)}>
                <FolderInputIcon className="size-4" /> Change
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {/* Phone: Save full width, Preview | Edit side by side, Discard last. Wider: one row. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Button variant="brand" className="col-span-2 h-11 gap-2 sm:col-auto" disabled={!!busy} onClick={() => save("PUBLIC")}>
          {busy === "save" ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />} Save paper
        </Button>
        <PreviewButton questions={asQuestions} defaultTwoColumn variant="outline" className="h-11 w-full sm:w-auto" />
        <Button variant="outline" className="h-11 w-full gap-2 sm:w-auto" disabled={!!busy} onClick={() => save("DRAFT")}>
          {busy === "edit" ? <Loader2Icon className="size-4 animate-spin" /> : <PencilIcon className="size-4" />} Edit
        </Button>
        <Button
          variant="ghost"
          className="col-span-2 h-11 text-red-700 hover:bg-red-50 hover:text-red-800 sm:ml-auto"
          disabled={!!busy}
          onClick={() =>
            withConfirmation(onDiscard, {
              title: "Discard this paper?",
              description: "Its questions were never added to the bank, so nothing else changes.",
              confirmText: "Discard",
            })
          }
        >
          Discard
        </Button>
      </div>
      <p className="-mt-2 text-center text-xs text-muted-foreground sm:text-left">Edit saves it as a draft first, so its questions join the bank.</p>

      <ChooseChapterSheet
        open={!!movingGroup}
        onOpenChange={(o) => !o && setMoving(null)}
        title="Save these questions in…"
        description={movingGroup ? `${movingGroup.ids.length} question${movingGroup.ids.length === 1 ? "" : "s"} now planned for ${movingGroup.chapter?.title ?? "no chapter"}.` : undefined}
        initial={{ course: input.course, subject: movingGroup?.chapter?.subject }}
        confirmLabel="Move here"
        confirmIcon={<FolderInputIcon className="size-4" />}
        onConfirm={move}
      />
    </section>
  );
}
