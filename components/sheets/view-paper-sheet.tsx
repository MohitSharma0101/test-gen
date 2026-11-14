"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PencilIcon,
  Undo2Icon,
} from "lucide-react";
import usePaper from "@/hooks/usePaper";
import Markdown from "../ui/markdown";
import { cn, getTotalMarks, segregateQuestionsBySubject } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import EditMarkdownSheet from "./edit-markdown-sheet";
import { TQuestion } from "@/models/Question";
import { putUpdateQuestion, savePaper } from "@/service/core.service";
import { Button, buttonVariants } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Skeleton } from "../ui/skeleton";
import { DocumentWindow, OPEN_ANIMATION_MS } from "../ui/document-window";
import { ErrorState } from "../ui/state-message";

const FIRST_BATCH = 4;
const NEXT_BATCH = 4;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paperId: string;
  title?: string;
};

const EditButton = ({ label, ...props }: { label: string } & React.ComponentProps<typeof Button>) => (
  <Button variant="ghost" aria-label={label} title={label} className="size-8 shrink-0 p-0" {...props}>
    <PencilIcon className="size-4" />
  </Button>
);

// Opens full screen (DocumentWindow): a paper is a document, not a side task.
// Read a saved paper, fix a question's text or answer, or untick questions and
// save the paper without them. "Add questions" opens the full editor.
export const ViewPaperSheet = ({ open, paperId, onOpenChange }: Props) => {
  const { paper, loading, refresh } = usePaper({ id: paperId });
  const questions = paper?.questions ?? [];
  const subjectQuestion = questions.length ? segregateQuestionsBySubject(questions) : [];
  const [selectedQuestions, setSelectedQuestions] = useState<Array<string | undefined>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (paper?.questions) setSelectedQuestions(paper.questions.map((q) => q._id?.toString()));
  }, [paper]);

  // Each card renders its maths, and drawing a 90-question paper in one go
  // froze the screen. Draw a few at once, then a small batch whenever the
  // browser is idle, so taps and scrolling are never blocked while it fills in.
  const [shown, setShown] = useState(FIRST_BATCH);
  useEffect(() => {
    setShown(FIRST_BATCH);
    if (!questions.length) return;
    let count = FIRST_BATCH;
    let handle = 0;
    const idle: (cb: () => void) => number =
      typeof window.requestIdleCallback === "function"
        ? (cb) => window.requestIdleCallback(cb, { timeout: 200 })
        : (cb) => window.setTimeout(cb, 32);
    const cancel = (h: number) =>
      typeof window.cancelIdleCallback === "function" ? window.cancelIdleCallback(h) : window.clearTimeout(h);
    const grow = () => {
      count = Math.min(count + NEXT_BATCH, questions.length);
      setShown(count);
      if (count < questions.length) handle = idle(grow);
    };
    // The window shows its body only after the open animation; growing before
    // that would just pile every card up for one big render at the end
    const start = window.setTimeout(() => {
      if (count < questions.length) handle = idle(grow);
    }, OPEN_ANIMATION_MS + 50);
    return () => {
      window.clearTimeout(start);
      cancel(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per loaded paper
  }, [paper]);

  const removedCount = questions.length - selectedQuestions.length;
  const canUpdate = Boolean(paper) && removedCount > 0;

  const updatePaper = async () => {
    if (!canUpdate || !paper || saving) return;
    setSaving(true);
    try {
      await savePaper(
        paper.title,
        paper.questions.filter((q) => selectedQuestions.includes(q._id)),
        paper._id,
        paper.author,
        paper.status
      );
      toast.success("Paper updated");
      refresh();
    } catch (err) {
      toast.error((err as Error)?.message || "Couldn't update the paper");
    } finally {
      setSaving(false);
    }
  };

  const updateQuestion = async (q: TQuestion) => {
    try {
      await putUpdateQuestion(q);
      refresh();
      toast.success("Question updated");
    } catch (err) {
      toast.error((err as Error)?.message || "Couldn't update the question");
    }
  };

  const toggle = (id: string, checked: boolean) =>
    setSelectedQuestions((prev) => (checked ? [...prev.filter((x) => x !== id), id] : prev.filter((x) => x !== id)));

  const body = () => {
    if (loading && !paper) {
      return (
        <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading paper">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      );
    }
    if (!paper) {
      return <ErrorState message="Couldn't load this paper." onRetry={() => refresh()} className="py-12" />;
    }
    if (questions.length === 0) {
      return <p className="px-4 py-12 text-center text-sm text-muted-foreground">This paper has no questions yet.</p>;
    }
    let drawn = 0;
    return (
      <div className="pb-4">
        {subjectQuestion.map(({ subject, questions: items }) => (
          <section key={subject} aria-label={subject}>
            <h3 className="sticky top-0 z-10 border-b bg-muted/95 px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground backdrop-blur">
              {subject}
            </h3>
            <ol className="mx-auto max-w-3xl space-y-3 px-4 pt-3">
              {items.map((item, index) => {
                if (!item._id || drawn >= shown) return null;
                drawn += 1;
                const id = item._id;
                const kept = selectedQuestions.includes(id);
                return (
                  <li
                    key={id}
                    className={cn("defer-offscreen rounded-xl border bg-card transition-opacity", !kept && "border-dashed opacity-50")}
                  >
                    <div className="flex items-center gap-2 px-3 pt-2">
                      <Checkbox
                        checked={kept}
                        onCheckedChange={(c) => toggle(id, Boolean(c))}
                        aria-label={kept ? `Remove question ${index + 1} from the paper` : `Keep question ${index + 1}`}
                      />
                      <span className="text-sm font-bold">Q{index + 1}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
                        {item.mark ?? 1} mark{(item.mark ?? 1) === 1 ? "" : "s"}
                      </span>
                      {!kept && <span className="text-xs font-medium text-red-700">Will be removed</span>}
                      <span className="ml-auto">
                        <EditMarkdownSheet text={item.text} onSave={(text) => updateQuestion({ id, text })}>
                          <EditButton label={`Edit question ${index + 1}`} />
                        </EditMarkdownSheet>
                      </span>
                    </div>
                    <div className="overflow-x-auto px-1">
                      <Markdown text={item.text ?? ""} />
                    </div>
                    <Collapsible className="border-t">
                      <div className="flex items-center">
                        <CollapsibleTrigger className="group flex flex-1 items-center gap-1.5 px-3 py-2 text-left text-sm font-medium text-brand">
                          <ChevronDownIcon
                            className="size-4 transition-transform group-data-[state=open]:rotate-180"
                            aria-hidden="true"
                          />
                          Answer & explanation
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent className="border-t bg-muted/40">
                        <div className="flex items-start gap-1 px-1 py-1">
                          <div className="min-w-0 flex-1 overflow-x-auto">
                            <Markdown text={item.ans ? `Ans: ${item.ans}` : "No answer added yet."} />
                          </div>
                          <EditMarkdownSheet text={item.ans} onSave={(ans) => updateQuestion({ id, ans })}>
                            <EditButton label={`Edit answer ${index + 1}`} className="mt-2 size-8 shrink-0 p-0" />
                          </EditMarkdownSheet>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    );
  };

  return (
    <DocumentWindow
      open={open}
      onOpenChange={onOpenChange}
      title={paper?.title || (loading ? "Loading paper…" : "Paper")}
      description={
        paper
          ? `${questions.length} questions · ${getTotalMarks(questions)} marks${paper.course ? ` · Class ${paper.course}` : ""}`
          : undefined
      }
      toolbar={
        paper ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Untick a question to remove it from this paper.</p>
            <Link
              href={`/papers/edit/${paper._id}`}
              target="_blank"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 gap-1.5")}
            >
              Add questions
              <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        ) : undefined
      }
      footer={
        canUpdate ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-11 gap-1.5"
              onClick={() => setSelectedQuestions(questions.map((q) => q._id?.toString()))}
            >
              <Undo2Icon className="size-4" /> Undo
            </Button>
            <Button
              onClick={updatePaper}
              variant="brand"
              disabled={saving}
              className="h-11 flex-1 gap-2"
            >
              {saving && <Loader2Icon className="size-4 animate-spin" />}
              Remove {removedCount} & save
            </Button>
          </div>
        ) : undefined
      }
    >
      {body()}
    </DocumentWindow>
  );
};
