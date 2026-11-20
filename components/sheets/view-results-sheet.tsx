"use client";

import { useState } from "react";
import { CheckCheckIcon, CheckIcon, Loader2Icon, MinusIcon, MonitorOffIcon, Trash2Icon, UsersIcon, XIcon } from "lucide-react";
import useAnswerSheets from "@/hooks/useAnswerSheets";
import useUsers from "@/hooks/useUsers";
import Clock from "@/lib/clock";
import { cn, sortResultsOnRank } from "@/lib/utils";
import { TestService } from "@/service/test.service";
import { Button } from "../ui/button";
import { toast } from "../ui/use-toast";
import DeleteButton from "../ui/delete-button";
import { Skeleton } from "../ui/skeleton";
import { DocumentWindow } from "../ui/document-window";
import { EmptyState, ErrorState } from "../ui/state-message";
import { ResponsiveList, type ListColumn } from "../ui/responsive-list";
import { ROUTE_GROUPS } from "@/data/routes";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  title?: string;
  batchId: string;
  // A test for chosen students lists only them (and "not attempted" counts only them)
  studentIds?: string[];
};

type TRow = ReturnType<typeof sortResultsOnRank>[number] & { rank?: number };

const percent = (r: TRow["result"]) =>
  r?.totalMarks ? Math.round(((r.obtainedMarks ?? 0) / r.totalMarks) * 100) : undefined;

const timeTaken = (r: TRow["result"]) =>
  r?.startedOn && r?.submittedOn ? Clock.getTimeDiffInFormat(r.startedOn, r.submittedOn) : "—";

// Gold/silver/bronze tint for the top three, plain after that
const rankStyle = (rank?: number) =>
  rank === 1
    ? "bg-amber-100 text-amber-800"
    : rank === 2
      ? "bg-slate-200 text-slate-700"
      : rank === 3
        ? "bg-orange-100 text-orange-800"
        : "bg-muted text-muted-foreground";

const Rank = ({ rank }: { rank?: number }) => (
  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums", rankStyle(rank))}>
    {rank ?? "—"}
  </span>
);

const Marks = ({ row }: { row: TRow }) =>
  row.result ? (
    <span className="tabular-nums">
      <span className="font-bold">{row.result.obtainedMarks ?? 0}</span>
      <span className="text-muted-foreground">/{row.result.totalMarks ?? 0}</span>
      {percent(row.result) !== undefined && <span className="ml-1.5 text-xs text-muted-foreground">{percent(row.result)}%</span>}
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">Not submitted</span>
  );

const Answers = ({ row }: { row: TRow }) =>
  row.result ? (
    <span className="inline-flex items-center gap-2.5 text-xs tabular-nums">
      <span className="inline-flex items-center gap-0.5 text-emerald-700" title="Correct">
        <CheckIcon className="size-3.5" aria-label="Correct" /> {row.result.correctAns ?? 0}
      </span>
      <span className="inline-flex items-center gap-0.5 text-red-700" title="Incorrect">
        <XIcon className="size-3.5" aria-label="Incorrect" /> {row.result.incorrectAns ?? 0}
      </span>
      <span className="inline-flex items-center gap-0.5 text-muted-foreground" title="Skipped">
        <MinusIcon className="size-3.5" aria-label="Skipped" /> {row.result.skippedAns ?? 0}
      </span>
    </span>
  ) : null;

const ScreenLeft = ({ row }: { row: TRow }) =>
  row.result?.screenLeftCount ? (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
      title="Times the student left the test screen"
    >
      <MonitorOffIcon className="size-3.5" aria-hidden="true" />
      Left {row.result.screenLeftCount}×
    </span>
  ) : null;

// Results of one scheduled test: every student in the batch, ranked by marks;
// students who didn't submit are listed after the ranked ones.
export const ViewResultSheet = ({ open, scheduleId, title, batchId, studentIds, onOpenChange }: Props) => {
  const { users: batchUsers, loading: userLoading } = useUsers({ batchId });
  const chosen = studentIds?.length ? new Set(studentIds) : null;
  const users = chosen ? batchUsers.filter((u) => chosen.has(String(u._id))) : batchUsers;
  const { answerSheets, loading: answersLoading, error, refresh } = useAnswerSheets({ scheduleId });
  const [rechecking, setRechecking] = useState(false);

  const ansMap = new Map(answerSheets?.results?.map((item) => [item.user, item]));
  const ranked = sortResultsOnRank(users.map((u) => ({ ...u, result: ansMap.get(u._id) })));
  const submitted: TRow[] = ranked.filter((r) => r.result).map((r, i) => ({ ...r, rank: i + 1 }));
  const pending: TRow[] = ranked.filter((r) => !r.result);
  const rows = [...submitted, ...pending];

  const loading = (userLoading || answersLoading) && !answerSheets;
  const avg = submitted.length
    ? Math.round(submitted.reduce((sum, r) => sum + (percent(r.result) ?? 0), 0) / submitted.length)
    : undefined;

  const onRecheck = async () => {
    setRechecking(true);
    try {
      await TestService.recheck(scheduleId);
      toast({ variant: "success", title: "Results updated" });
      refresh();
    } catch {
      toast({ variant: "destructive", title: "Couldn't recheck the results" });
    } finally {
      setRechecking(false);
    }
  };

  const onDelete = async (answerSheetId?: string) => {
    if (!answerSheetId) return;
    try {
      await TestService.deleteAnswerSheet(answerSheetId);
      toast({ variant: "success", title: "Answer sheet deleted" });
      refresh();
    } catch {
      toast({ variant: "destructive", title: "Couldn't delete the answer sheet" });
    }
  };

  const remove = (row: TRow) => (
    <DeleteButton
      variant="ghost"
      disabled={!row.result}
      className="size-9 shrink-0 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 md:size-8"
      title={`Delete ${row.name || "this student"}'s answer sheet?`}
      description="Their marks are removed and they can take the test again if it's still open."
      onDelete={(close) => {
        onDelete(row.result?._id);
        close();
      }}
    >
      <Trash2Icon className="size-4" aria-label={`Delete ${row.name ?? "student"}'s answer sheet`} />
    </DeleteButton>
  );

  const columns: ListColumn<TRow>[] = [
    { header: "Rank", width: "w-16", cell: (r) => <Rank rank={r.rank} /> },
    {
      header: "Student",
      cell: (r) => (
        <>
          <span className="block truncate font-medium">{r.name || "—"}</span>
          <span className="text-xs text-muted-foreground">{r.userId ?? ""}</span>
        </>
      ),
    },
    { header: "Marks", width: "w-36", cell: (r) => <Marks row={r} /> },
    { header: "Answers", width: "w-40", cell: (r) => <Answers row={r} /> },
    {
      header: "Time",
      width: "w-40",
      className: "text-xs",
      cell: (r) =>
        r.result ? (
          <>
            <span className="block font-medium tabular-nums">{timeTaken(r.result)}</span>
            <span className="block text-muted-foreground">
              {r.result.submittedOn ? `Submitted ${Clock.getDateTimeInFormat(r.result.submittedOn)}` : "Not submitted yet"}
            </span>
          </>
        ) : null,
    },
    { header: "Screen", width: "w-28", cell: (r) => <ScreenLeft row={r} /> },
    { header: "Actions", srOnlyHeader: true, width: "w-14", cell: (r) => (r.result ? remove(r) : null) },
  ];

  const card = (r: TRow) => (
    <div className={cn("flex items-start gap-3 rounded-xl border bg-card p-3 shadow-sm", !r.result && "opacity-70")}>
      <Rank rank={r.rank} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-bold leading-snug">{r.name || "—"}</p>
            <p className="text-xs text-muted-foreground">{r.userId ?? ""}</p>
          </div>
          <Marks row={r} />
        </div>
        {r.result && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Answers row={r} />
            <span className="text-xs tabular-nums text-muted-foreground">{timeTaken(r.result)}</span>
            <ScreenLeft row={r} />
          </div>
        )}
      </div>
      {r.result && remove(r)}
    </div>
  );

  const body = () => {
    if (loading) {
      return (
        <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading results">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      );
    }
    if (error || !answerSheets) {
      return <ErrorState message="Couldn't load the results." onRetry={refresh} className="py-12" />;
    }
    if (rows.length === 0) {
      return (
        <EmptyState
          className="py-12"
          tone={ROUTE_GROUPS.daily.tile}
          icon={<UsersIcon />}
          title="No students in this batch"
          description="Add students to the batch to see their results here."
        />
      );
    }
    return (
      <div className="p-4">
        <ResponsiveList rows={rows} rowKey={(r) => r._id} columns={columns} renderCard={card} />
      </div>
    );
  };

  return (
    <DocumentWindow
      open={open}
      onOpenChange={onOpenChange}
      title={title ? title.replace(/^Result - /, "") : "Results"}
      description={
        answerSheets
          ? `${submitted.length} of ${rows.length} submitted${avg !== undefined ? ` · average ${avg}%` : ""}`
          : "Results"
      }
      toolbar={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onRecheck} disabled={rechecking || !answerSheets} className="h-10 gap-2">
            {rechecking ? <Loader2Icon className="size-4 animate-spin" /> : <CheckCheckIcon className="size-4" />}
            Recheck all
          </Button>
          <p className="hidden text-xs text-muted-foreground sm:block">Marks every submitted sheet again.</p>
        </div>
      }
      bodyClassName="bg-muted/40"
    >
      {body()}
    </DocumentWindow>
  );
};
