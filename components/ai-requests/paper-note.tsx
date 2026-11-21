"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronDownIcon, TriangleAlertIcon, WrenchIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Markdown from "@/components/ui/markdown";
import EditMarkdownSheet from "@/components/sheets/edit-markdown-sheet";
import { api } from "@/lib/api";
import { putUpdateQuestion } from "@/service/core.service";
import { apiErrorMsg } from "@/lib/utils";
import type { TQuestion } from "@/models/Question";

/**
 * Claude's note on a made paper is written as labelled lines (see
 * .claude/skills/make-paper): "Summary:", "Covered: a; b", "Left out:",
 * "Short:" (repeatable), "Fix: <question id> | problem" (repeatable),
 * "Details:". Older notes without labels show as plain text.
 */
type TNote = { summary?: string; covered: string[]; leftOut?: string; short: string[]; fix: { id: string; problem: string }[]; details: string[] };

export const parseNote = (note: string): TNote | null => {
  const out: TNote = { covered: [], short: [], fix: [], details: [] };
  let labelled = false;
  for (const raw of note.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(Summary|Covered|Left out|Short|Fix|Details):\s*(.*)$/i);
    if (!m) {
      out.details.push(line);
      continue;
    }
    labelled = true;
    const [, label, value] = m;
    const key = label.toLowerCase();
    if (key === "summary") out.summary = value;
    else if (key === "covered") out.covered.push(...value.split(";").map((x) => x.trim()).filter(Boolean));
    else if (key === "left out") out.leftOut = value;
    else if (key === "short") value && !/^none\.?$/i.test(value) && out.short.push(value);
    else if (key === "fix") {
      const [id, ...rest] = value.split("|");
      if (/^[a-f0-9]{24}$/i.test(id.trim())) out.fix.push({ id: id.trim(), problem: rest.join("|").trim() });
      else out.details.push(value);
    } else out.details.push(value);
  }
  return labelled ? out : null;
};

/** A bank question Claude found broken: the question itself, the problem, and edit in place. */
function FixItem({ id, problem }: { id: string; problem: string }) {
  const { data: q, isLoading, mutate } = useSWR(["question", id], async () => ((await api.get("question", { params: { questionId: id } }))?.data?.questions?.[0] ?? null) as TQuestion | null);
  const [editing, setEditing] = useState<"text" | "ans" | null>(null);

  const save = async (value: string) => {
    if (!q || !editing) return;
    try {
      await putUpdateQuestion({ ...q, [editing]: value });
      toast.success(editing === "ans" ? "Answer saved. Tests using it are re-marked." : "Question saved");
      setEditing(null);
      mutate();
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't save"));
    }
  };

  return (
    <li className="space-y-2 rounded-xl border bg-card p-3">
      <p className="text-sm font-medium text-red-800">{problem}</p>
      {isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : !q ? (
        <p className="text-sm text-muted-foreground">This question is no longer in the bank.</p>
      ) : (
        <>
          <div className="line-clamp-4 overflow-hidden text-sm [&_img]:max-h-24">
            <Markdown text={q.text ?? ""} />
          </div>
          <p className="truncate text-xs text-muted-foreground">Answer: {(q.ans ?? "").split("\n")[0]}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-11" onClick={() => setEditing("text")}>
              Edit question
            </Button>
            <Button variant="outline" className="h-11" onClick={() => setEditing("ans")}>
              Edit answer
            </Button>
          </div>
          {editing && (
            <EditMarkdownSheet
              open
              onOpenChange={(o) => !o && setEditing(null)}
              title={editing === "text" ? "Edit question" : "Edit answer & explanation"}
              text={editing === "text" ? q.text : q.ans}
              onSave={save}
            />
          )}
        </>
      )}
    </li>
  );
}

export function PaperNote({ note }: { note: string }) {
  const n = parseNote(note);
  if (!n)
    return (
      <div className="rounded-xl bg-muted/50 p-3">
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Claude&apos;s note</p>
        <p className="whitespace-pre-wrap break-words text-sm">{note}</p>
      </div>
    );

  return (
    <div className="space-y-3">
      {n.summary && <p className="text-sm font-medium">{n.summary}</p>}

      {n.covered.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Covered</p>
          <ul className="flex flex-wrap gap-1.5">
            {n.covered.map((c) => (
              <li key={c} className="rounded-full border bg-background px-2.5 py-1 text-xs">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {n.leftOut && (
        <p className="text-sm">
          <span className="text-xs font-semibold text-muted-foreground">Left out as asked: </span>
          {n.leftOut}
        </p>
      )}

      {n.short.length > 0 && (
        <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium">The bank was short</p>
            {n.short.map((s) => (
              <p key={s}>{s}</p>
            ))}
          </div>
        </div>
      )}

      {n.fix.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <WrenchIcon className="size-3.5" aria-hidden="true" /> Questions to fix in the bank ({n.fix.length}) · left out of this paper
          </p>
          <ul className="space-y-2">
            {n.fix.map((f) => (
              <FixItem key={f.id} id={f.id} problem={f.problem} />
            ))}
          </ul>
        </div>
      )}

      {n.details.length > 0 && (
        <details className="group">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-brand [&::-webkit-details-marker]:hidden">
            <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" /> More details
          </summary>
          <div className="space-y-1 text-sm text-muted-foreground">
            {n.details.map((d, i) => (
              <p key={i}>{d}</p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
