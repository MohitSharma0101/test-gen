"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2Icon, UsersIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import LabelInput from "../ui/label-input";
import SelectCompact from "../ui/select-compact";
import { Skeleton } from "../ui/skeleton";
import { ResponsiveDrawer } from "../ui/responsive-drawer";
import { EmptyState } from "../ui/state-message";
import { toast } from "../ui/use-toast";
import { TBatch } from "@/models/Batch";
import { TExamResult } from "@/models/ExamResult";
import { api, ENDPOINT } from "@/lib/api";
import useUsers from "@/hooks/useUsers";
import { useCourses } from "@/hooks/useCourses";
import { cn, courseLabel } from "@/lib/utils";

type Props = {
  defaultExamResult?: TExamResult | null;
  batch: TBatch;
  date: string;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit?: () => void;
};

// "2026-11-14" → "14 Nov 2026"; anything else shown as given
const prettyDate = (value?: string) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : value ?? "";
};

// Enter a batch's marks for one exam (or read a saved result). Marks are
// typed down the list: Enter moves to the next student. A blank box means
// absent and is not sent (clearing a box used to save it as 0).
export const AddResultSheet = ({ open, onOpenChange, batch, date, defaultExamResult, onSubmit }: Props) => {
  const viewMode = !!defaultExamResult;
  const { users, loading: usersLoading } = useUsers({ batchId: batch._id, shouldLoad: !!batch._id });
  const { course, subject, setCourse, setSubject, courses, subjects } = useCourses();

  // A subject from the previous class may not exist in the new one
  useEffect(() => {
    const list = subjects ?? [];
    if (!list.includes(subject)) setSubject(list[0] ?? "");
  }, [subjects, subject, setSubject]);

  const [name, setName] = useState(defaultExamResult?.name ?? "");
  const [totalMarks, setTotalMarks] = useState(String(defaultExamResult?.totalMarks ?? 100));
  const [results, setResults] = useState<Record<string, string>>(
    (defaultExamResult?.results ?? []).reduce<Record<string, string>>((acc, curr) => {
      if (curr?.userId != null) acc[String(curr.userId)] = curr.marks == null ? "" : String(curr.marks);
      return acc;
    }, {})
  );
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const total = Number(totalMarks) || 0;
  const entered = useMemo(() => Object.entries(results).filter(([, v]) => v.trim() !== ""), [results]);
  const invalid = entered.filter(([, v]) => !Number.isFinite(Number(v)) || Number(v) < 0 || (total > 0 && Number(v) > total));
  const average = entered.length ? entered.reduce((s, [, v]) => s + (Number(v) || 0), 0) / entered.length : 0;
  const canSave = !viewMode && Boolean(name.trim()) && total > 0 && invalid.length === 0 && entered.length > 0 && !saving;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const next = inputRefs.current[index + 1];
    if (next) next.focus();
    else e.currentTarget.blur();
  };

  const handleSubmit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await api.post(ENDPOINT.examResults, {
        name: name.trim(),
        batchId: batch?._id,
        subject,
        date,
        totalMarks: total,
        results: entered.map(([userId, value]) => ({ userId, marks: Number(value) })),
      });
      toast({ title: "Result saved", description: `${name.trim()} · ${entered.length} students`, variant: "success" });
      onSubmit?.();
    } catch (err) {
      // Stays open with every mark kept
      toast({ title: "Couldn't save the result", description: (err as Error)?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const list = () => {
    if (usersLoading && users.length === 0) {
      return (
        <div className="space-y-2" aria-busy="true" aria-label="Loading students">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      );
    }
    if (users.length === 0) return <EmptyState className="py-8" icon={<UsersIcon />} title="No students in this batch" />;
    return (
      <ol className="divide-y rounded-xl border bg-card">
        {users.map((user, index) => {
          const value = results[user._id] ?? "";
          const bad = value.trim() !== "" && invalid.some(([id]) => id === user._id);
          const id = `marks-${user._id}`;
          return (
            <li key={user._id} className="flex min-h-12 items-center gap-3 px-3 py-1.5">
              <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
              <label htmlFor={id} className="min-w-0 flex-1 truncate text-sm font-medium">
                {user.name || "—"}
              </label>
              {viewMode ? (
                <span className={cn("w-20 text-right text-sm font-bold tabular-nums", value === "" && "font-normal text-muted-foreground")}>
                  {value === "" ? "Absent" : `${value}/${total}`}
                </span>
              ) : (
                <Input
                  id={id}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  inputMode="decimal"
                  enterKeyHint={index === users.length - 1 ? "done" : "next"}
                  placeholder="—"
                  aria-invalid={bad}
                  className={cn("h-10 w-20 text-right text-base tabular-nums sm:text-sm", bad && "border-red-400 bg-red-50")}
                  onKeyDown={(e) => onKeyDown(e, index)}
                  value={value}
                  onChange={(e) => setResults((prev) => ({ ...prev, [user._id]: e.target.value.replace(/[^\d.]/g, "") }))}
                />
              )}
            </li>
          );
        })}
      </ol>
    );
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={(o) => onOpenChange?.(o)}
      title={viewMode ? defaultExamResult?.name || "Result" : "Add result"}
      description={`${batch.name} · ${prettyDate(date)}`}
      footer={
        viewMode ? (
          <p className="text-center text-sm text-muted-foreground">
            {entered.length} of {users.length} appeared · average{" "}
            <strong className="tabular-nums text-foreground">{Math.round(average * 10) / 10}</strong>/{total}
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">
              <strong className="tabular-nums text-foreground">{entered.length}</strong> of {users.length} entered
              {invalid.length > 0 && <span className="block text-xs font-medium text-red-700">Marks above {total} are highlighted</span>}
            </p>
            <Button variant="brand" className="h-11 gap-2 px-6" disabled={!canSave} onClick={handleSubmit}>
              {saving && <Loader2Icon className="size-4 animate-spin" />}
              Save result
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4 p-4">
        {!viewMode && (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <LabelInput
                label="Exam name"
                placeholder="e.g. Weekly test 4"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                inputClassName="h-11 text-base sm:text-sm"
              />
              <LabelInput
                label="Out of"
                inputMode="numeric"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputClassName="h-11 text-base tabular-nums sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectCompact
                label="Class"
                placeholder="Class"
                value={course}
                onChange={setCourse}
                options={courses.map((c) => ({ label: courseLabel(c), value: c }))}
                className="min-w-0"
              />
              <SelectCompact
                label="Subject"
                placeholder="Subject"
                value={subject}
                onChange={setSubject}
                options={(subjects ?? []).map((s) => ({ label: s, value: s }))}
                className="min-w-0"
              />
            </div>
          </div>
        )}

        <section className="space-y-2">
          <h3 className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Marks{viewMode ? "" : ` out of ${total || "—"}`}</span>
            {!viewMode && <span className="font-medium normal-case tracking-normal">Blank = absent · Enter = next</span>}
          </h3>
          {list()}
        </section>
      </div>
    </ResponsiveDrawer>
  );
};
