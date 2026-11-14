"use client";

import { FileTextIcon, XIcon } from "lucide-react";
import DeleteButton from "@/components/ui/delete-button";
import type { TQuestion } from "@/models/Question";
import { sortQuestionsByMarks } from "@/lib/utils";

type Props = {
  questions: TQuestion[];
  onRemove: (question: TQuestion) => void;
  onClear: () => void;
};

const SYMBOLS: Record<string, string> = {
  theta: "θ", alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ", mu: "μ", pi: "π", omega: "ω", Omega: "Ω",
  lambda: "λ", sigma: "σ", rho: "ρ", phi: "φ", epsilon: "ε", circ: "°", times: "×", cdot: "·", pm: "±",
  le: "≤", ge: "≥", leq: "≤", geq: "≥", neq: "≠", infty: "∞", rightarrow: "→", to: "→", sqrt: "√",
};

// Plain one-line text for the tray: LaTeX and images would only be noise here
const snippet = (text?: string) =>
  (text ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "[image]")
    .replace(/\\(?:text|mathrm|mathbf|operatorname)\{([^}]*)\}/g, "$1")
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1/$2")
    .replace(/\\([a-zA-Z]+)/g, (_, name: string) => SYMBOLS[name] ?? "")
    .replace(/\$\$?|\\[()[\]]|[{}]|\^|_/g, "")
    .replace(/\s+/g, " ")
    .trim() || "(no text)";

// The paper as it will print: grouped by marks, lowest first (the frames sort the same way)
const PaperTray = ({ questions, onRemove, onClear }: Props) => {
  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <FileTextIcon className="size-6" strokeWidth={1.5} />
        </span>
        <p className="font-semibold">No questions yet</p>
        <p className="text-sm text-muted-foreground">Tap questions to add them. They&apos;ll line up here as they will print.</p>
      </div>
    );
  }

  const sorted = sortQuestionsByMarks(questions);
  const groups: { mark: number; items: TQuestion[] }[] = [];
  for (const q of sorted) {
    const mark = q.mark || 0;
    const last = groups[groups.length - 1];
    if (last && last.mark === mark) last.items.push(q);
    else groups.push({ mark, items: [q] });
  }

  let n = 0;
  return (
    <div className="space-y-3 p-3">
      {groups.map((g) => (
        <section key={g.mark}>
          <h3 className="mb-1 flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>
              {g.mark} mark{g.mark === 1 ? "" : "s"} · {g.items.length}
            </span>
            <span className="tabular-nums">{g.mark * g.items.length}</span>
          </h3>
          <ol className="divide-y rounded-xl border bg-card">
            {g.items.map((q) => {
              n += 1;
              return (
                <li key={q._id} className="flex items-start gap-2 py-1.5 pl-2.5 pr-1">
                  <span className="w-5 shrink-0 pt-1 text-right text-xs tabular-nums text-muted-foreground">{n}</span>
                  <span className="line-clamp-2 min-w-0 flex-1 pt-0.5 text-sm leading-snug">{snippet(q.text)}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(q)}
                    aria-label={`Remove question ${n}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <XIcon className="size-4" />
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      <DeleteButton
        variant="ghost"
        size="sm"
        className="h-9 w-full text-muted-foreground hover:text-red-700"
        title="Remove all questions?"
        description="The paper will be empty. Questions stay in the bank."
        confirmText="Remove all"
        onDelete={(close) => {
          close();
          onClear();
        }}
      >
        Remove all
      </DeleteButton>
    </div>
  );
};

export default PaperTray;
