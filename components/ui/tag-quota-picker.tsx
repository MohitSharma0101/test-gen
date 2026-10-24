"use client";

import { Button } from "./button";
import { Input } from "./input";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";
import { TAGS } from "@/components/sheets/add-tag-sheet";
import { cn } from "@/lib/utils";
import { MinusIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

export type TTagQuota = { tag: string; count: string };

type Props = {
  quotas: TTagQuota[];
  onChange: (quotas: TTagQuota[]) => void;
  total: number;
  // Questions carrying each tag in the chapters picked, once counted
  availableFor?: (tag: string) => number | undefined;
};

// "5 of these must be Numerical", as one scrolling row of chips rather than a
// stack of rows: the panel has a chapter tree to show and cannot spend its
// height on a form. Every tag lives in one popover with a stepper each, so a
// quota is set where its supply is shown, and a count of nothing simply means
// the tag is not required - there is no adding or removing to think about.
const TagQuotaPicker = ({ quotas, onChange, total, availableFor }: Props) => {
  // Opened by hand rather than by a trigger: every chip opens the same panel,
  // and a trigger per chip would anchor it to whichever chip was clicked - so
  // it moved as chips were added, removed, or scrolled.
  const [open, setOpen] = useState(false);

  const countOf = (tag: string) =>
    Number(quotas.find((q) => q.tag === tag)?.count) || 0;

  const setCount = (tag: string, next: number) => {
    const count = Math.max(0, Math.min(next, 300));
    const without = quotas.filter((q) => q.tag !== tag);
    onChange(count === 0 ? without : [...without, { tag, count: String(count) }]);
  };

  const active = quotas.filter((q) => Number(q.count) > 0);
  const required = active.reduce((sum, q) => sum + (Number(q.count) || 0), 0);
  const free = total - required;
  const over = free < 0;

  const sentence = (() => {
    const parts = active.map((q) => `${Number(q.count)} ${q.tag}`);
    if (parts.length === 0) return `${total} from any tag`;
    return free > 0
      ? `${parts.join(" + ")} + ${free} from any tag`
      : parts.join(" + ");
  })();

  const editor = (
    <PopoverContent align="start" className="w-[290px] p-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Must include
        </p>
        <span
          className={cn(
            "text-[11px] tabular-nums",
            over ? "text-amber-600 font-medium" : "text-slate-400"
          )}
        >
          {over ? `${required} of ${total}` : `${free} free of ${total}`}
        </span>
      </div>

      <div className="max-h-[260px] overflow-y-auto py-1">
        {TAGS.map((tag) => {
          const count = countOf(tag);
          const supply = availableFor?.(tag);
          const thin = supply !== undefined && supply < count;
          return (
            <div
              key={tag}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5",
                count > 0 && "bg-sky-50/60"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{tag}</p>
                {supply !== undefined && (
                  <p
                    className={cn(
                      "text-[11px] tabular-nums",
                      supply === 0
                        ? "text-slate-300"
                        : thin
                          ? "text-amber-600 font-medium"
                          : "text-slate-400"
                    )}
                  >
                    {thin && <TriangleAlertIcon className="inline w-3 h-3 mr-0.5 -mt-0.5" />}
                    {supply} available
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  aria-label={`One fewer ${tag}`}
                  disabled={count === 0}
                  onClick={() => setCount(tag, count - 1)}
                >
                  <MinusIcon className="w-3.5 h-3.5" />
                </Button>
                <Input
                  type="number"
                  min={0}
                  max={300}
                  value={count === 0 ? "" : String(count)}
                  placeholder="0"
                  aria-label={`How many ${tag} questions`}
                  onChange={(e) => setCount(tag, Number(e.target.value) || 0)}
                  className="w-11 h-7 px-1 text-center tabular-nums"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  aria-label={`One more ${tag}`}
                  onClick={() => setCount(tag, count + 1)}
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </PopoverContent>
  );

  return (
    <div>
      <label className="text-xs font-medium text-slate-600">Must include</label>

      <Popover open={open} onOpenChange={setOpen}>
        {/* The whole row is the anchor, so the panel always opens under the
            list and stays put as chips come and go */}
        <PopoverAnchor asChild>
          <div className="mt-1.5 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {active.map((quota) => {
              const supply = availableFor?.(quota.tag);
              const thin = supply !== undefined && supply < Number(quota.count);
              return (
                <button
                  key={quota.tag}
                  onClick={() => setOpen(true)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 h-8 text-xs font-medium whitespace-nowrap transition-colors",
                    thin
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100"
                  )}
                >
                  {quota.tag}
                  <span className="ml-1.5 tabular-nums font-semibold">
                    {Number(quota.count)}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => setOpen(true)}
              className={cn(
                "shrink-0 rounded-full border border-dashed border-slate-300 px-3 h-8 text-xs font-medium text-slate-500 hover:bg-slate-50 whitespace-nowrap",
                active.length === 0 && "border-solid"
              )}
            >
              {active.length === 0 ? "+ Require a tag" : "+"}
            </button>
          </div>
        </PopoverAnchor>

        {editor}
      </Popover>

      <p
        className={cn(
          "text-[11px] pt-1.5",
          over ? "text-amber-600 font-medium" : "text-slate-500"
        )}
      >
        {over
          ? `${required} required of ${total} — reduce a tag or raise the total`
          : sentence}
      </p>
    </div>
  );
};

export default TagQuotaPicker;
