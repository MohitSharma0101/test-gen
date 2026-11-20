"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BrainCircuitIcon,
  CalendarClockIcon,
  ChartColumnIcon,
  EllipsisVerticalIcon,
  FileTextIcon,
  ListRestartIcon,
  RefreshCwIcon,
  RepeatIcon,
  TimerIcon,
  TrashIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import QuestionAnalyzerSheet from "@/components/sheets/question-analyzer-sheet";
import { BatchInsightsWindow } from "@/components/insights/batch-insights-window";
import { ViewPaperSheet } from "@/components/sheets/view-paper-sheet";
import { ViewResultSheet } from "@/components/sheets/view-results-sheet";
import { TestStudentsSheet } from "@/components/sheets/test-students-sheet";
import { SchedulePaperSheet } from "@/components/sheets/schedule-paper-sheet";
import type { TAnswerSheet } from "@/models/AnswerSheet";
import type { TUser } from "@/models/User";
import SelectCompact from "@/components/ui/select-compact";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/state-message";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTE_GROUPS } from "@/data/routes";
import { Role } from "@/data/const";
import { useAuth } from "@/context/auth-context";
import useBatches from "@/hooks/useBatches";
import useSchedulePapers from "@/hooks/useSchedulePapers";
import { api, ENDPOINT } from "@/lib/api";
import { invalidateAfterWrite } from "@/lib/swr";
import useJob from "@/hooks/useJob";
import { JobProgress } from "@/components/ui/job-progress";
import { apiErrorMsg, cn, getScheduleStatus, withConfirmation } from "@/lib/utils";
import { TSchedulePaper } from "@/models/SchedulePaper";

const TONE = ROUTE_GROUPS.daily.tile;
const BATCH_KEY = "online-test:batch";

type TStatus = ReturnType<typeof getScheduleStatus>;

// One list, live first: the badge on each card says which is which, so
// separate headed sections only added noise
const ORDER: Record<TStatus, number> = { active: 0, upcoming: 1, expired: 2 };

const STATUS_BADGE: Record<TStatus, { label: string; className: string }> = {
  active: { label: "Live", className: "bg-emerald-50 text-emerald-700" },
  upcoming: { label: "Upcoming", className: "bg-amber-50 text-amber-800" },
  expired: { label: "Ended", className: "bg-muted text-muted-foreground" },
};

// "20 Nov, 10:30 AM – 11:30 AM" (end date repeated only if it's another day)
const formatWindow = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "—";
  const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return day(s) === day(e)
    ? `${day(s)}, ${time(s)} – ${time(e)}`
    : `${day(s)}, ${time(s)} – ${day(e)}, ${time(e)}`;
};

type CardProps = {
  test: TSchedulePaper;
  status: TStatus;
  onResults: () => void;
  onAnalyze: () => void;
  onViewPaper: () => void;
  onDelete: () => void;
  onStudents: () => void;
  onRetest: () => void;
};

const TestCard = ({ test, status, onResults, onAnalyze, onViewPaper, onDelete, onStudents, onRetest }: CardProps) => {
  const chosen = test.students?.length ?? 0;
  const badge = STATUS_BADGE[status];
  return (
    <li className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-bold leading-snug">{test.paper?.title || "Untitled paper"}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClockIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span>
              {formatWindow(test.startTime, test.endTime)} · <span className="tabular-nums">{test.duration} min</span>
            </span>
          </p>
          {chosen > 0 && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
              <UsersIcon className="size-3.5" aria-hidden="true" /> {chosen} student{chosen === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", badge.className)}>
          {status === "active" && <span className="size-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" aria-hidden="true" />}
          {badge.label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onResults} className="h-9 flex-1 gap-1.5 sm:flex-none">
          <TrophyIcon className="size-4" aria-hidden="true" /> Results
        </Button>
        <Button variant="outline" onClick={onAnalyze} className="h-9 flex-1 gap-1.5 sm:flex-none">
          <ChartColumnIcon className="size-4" aria-hidden="true" /> Analyze
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`More actions for "${test.paper?.title ?? "test"}"`}
            className={cn(buttonVariants({ variant: "ghost" }), "ml-auto size-9 shrink-0 p-0")}
          >
            <EllipsisVerticalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
            <DropdownMenuItem className="h-10 cursor-pointer gap-2.5 rounded-lg" onSelect={onViewPaper} disabled={!test.paper?._id}>
              <FileTextIcon className="size-4" aria-hidden="true" /> View paper
            </DropdownMenuItem>
            <DropdownMenuItem className="h-10 cursor-pointer gap-2.5 rounded-lg" onSelect={onStudents}>
              <UsersIcon className="size-4" aria-hidden="true" /> Who takes it
            </DropdownMenuItem>
            {status === "expired" && (
              <DropdownMenuItem className="h-10 cursor-pointer gap-2.5 rounded-lg" onSelect={onRetest} disabled={!test.paper?._id}>
                <RepeatIcon className="size-4" aria-hidden="true" /> Retest who missed it
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="h-10 cursor-pointer gap-2.5 rounded-lg text-red-700 focus:bg-red-50 focus:text-red-700"
              onSelect={onDelete}
            >
              <TrashIcon className="size-4" aria-hidden="true" /> Delete test
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
};

const OnlineTestPage = () => {
  const { batches, loading: batchesLoading } = useBatches();
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const { schedulePapersRes, loading, error, refresh } = useSchedulePapers({ batchId: selectedBatchId });
  const [viewPaperId, setViewPaperId] = useState<string | null>(null);
  const [viewScheduleResult, setViewScheduleResult] = useState<TSchedulePaper | null>(null);
  const [analyzerId, setAnalyzerId] = useState<string | null>(null);
  const [analyzerTitle, setAnalyzerTitle] = useState("");
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [studentsTest, setStudentsTest] = useState<TSchedulePaper | null>(null);
  const [retest, setRetest] = useState<{ testId: string; paperId: string; batchId: string; studentIds: string[]; duration: number } | null>(null);

  // "Retest who missed it": the students this test was for (its chosen list, or
  // the batch) minus everyone who started or submitted it.
  const openRetest = async (test: TSchedulePaper) => {
    if (!selectedBatchId || !test.paper?._id) return;
    try {
      const [sheetsRes, usersRes] = await Promise.all([
        api.get(ENDPOINT.answerSheets, { params: { scheduleId: test._id } }),
        test.students?.length ? null : api.get(ENDPOINT.users, { params: { batchId: selectedBatchId } }),
      ]);
      const attempted = new Set(((sheetsRes?.data?.data?.results ?? []) as TAnswerSheet[]).map((s) => String(s.user)));
      const assigned = test.students?.length
        ? test.students.map(String)
        : ((usersRes?.data?.users ?? []) as TUser[]).map((u) => String(u._id));
      const missed = assigned.filter((id) => !attempted.has(id));
      if (!missed.length) {
        toast.success("Everyone took this test: nobody to retest");
        return;
      }
      setRetest({ testId: test._id, paperId: test.paper._id, batchId: selectedBatchId, studentIds: missed, duration: test.duration });
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't find who missed it"));
    }
  };
  const { account } = useAuth();
  const isAdmin = account?.role === Role.ADMIN;
  // Re-mark all tests runs as a background job (lib/jobs); this page only
  // starts it and shows progress. When it ends, refresh what it changed.
  const onRemarkDone = useCallback(() => {
    invalidateAfterWrite("answer-sheets/recheck");
    refresh();
  }, [refresh]);
  const remarkJob = useJob("remark-all", onRemarkDone);
  const remarking = remarkJob.active;

  const remarkAll = () =>
    withConfirmation(
      async () => {
        try {
          const job = await remarkJob.start();
          if (job?.status === "running" || job?.status === "queued") toast.success("Re-marking started");
        } catch (err) {
          toast.error(apiErrorMsg(err, "Couldn't start re-marking"));
        }
      },
      {
        title: "Re-mark all tests?",
        description:
          "Every test that was already marked is checked again against the current answer keys. Students' scores and ranks can change. It runs on the server; you can leave this page.",
        confirmText: "Re-mark all",
      }
    );

  // Teachers usually check the same batch: remember it on this device
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BATCH_KEY);
      if (saved) setSelectedBatchId(saved);
    } catch {}
  }, []);
  const pickBatch = (id: string) => {
    setSelectedBatchId(id);
    try {
      localStorage.setItem(BATCH_KEY, id);
    } catch {}
  };
  // A remembered batch that no longer exists (archived/deleted) is dropped
  useEffect(() => {
    if (!batchesLoading && selectedBatchId && batches.length && !batches.some((b) => b._id === selectedBatchId)) {
      setSelectedBatchId(undefined);
    }
  }, [batches, batchesLoading, selectedBatchId]);

  const tests = schedulePapersRes?.schedulePapers ?? [];
  const sorted = tests
    .map((test) => ({ test, status: getScheduleStatus(test.startTime, test.endTime) as TStatus }))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  const onDelete = (schedulePaperId: string) => {
    withConfirmation(async () => {
      try {
        await api.delete(ENDPOINT.schedulePaper, { params: { schedulePaperId } });
        toast.success("Test deleted");
        refresh();
      } catch (err) {
        toast.error(apiErrorMsg(err, "Couldn't delete the test"));
      }
    });
  };

  const content = () => {
    if (!selectedBatchId) {
      return (
        <EmptyState
          className="rounded-2xl border bg-card py-12"
          tone={TONE}
          icon={<UsersIcon />}
          title="Pick a batch"
          description="Its scheduled tests will show here."
        />
      );
    }
    // Also before the first response: the hook only flips `loading` on in an
    // effect, so for one frame it would read as "no tests"
    if (!schedulePapersRes && !error) {
      return (
        <div className="grid gap-3 md:grid-cols-2" aria-busy="true" aria-label="Loading tests">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      );
    }
    if (error) {
      return <ErrorState message="Couldn't load tests for this batch." onRetry={refresh} className="rounded-2xl border bg-card py-12" />;
    }
    if (tests.length === 0) {
      return (
        <EmptyState
          className="rounded-2xl border bg-card py-12"
          tone={TONE}
          icon={<TimerIcon />}
          title="No tests scheduled"
          description="Schedule one from a paper on the Papers page."
          action={
            <Link href="/papers" className={cn(buttonVariants({ variant: "brand" }), "gap-2")}>
              Go to Papers
            </Link>
          }
        />
      );
    }
    return (
      <ul className={cn("grid gap-3 md:grid-cols-2", loading && "opacity-60 transition-opacity")}>
        {sorted.map(({ test, status }) => (
          <TestCard
            key={test._id}
            test={test}
            status={status}
            onResults={() => setViewScheduleResult(test)}
            onAnalyze={() => {
              setAnalyzerId(test._id);
              setAnalyzerTitle(test.paper?.title ?? "");
            }}
            onViewPaper={() => test.paper?._id && setViewPaperId(test.paper._id)}
            onDelete={() => onDelete(test._id)}
            onStudents={() => setStudentsTest(test)}
            onRetest={() => openRetest(test)}
          />
        ))}
      </ul>
    );
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-12 pt-5 sm:px-6">
      <PageHeader
        icon={<TimerIcon />}
        tone={TONE}
        title="Online tests"
        description={selectedBatchId && !loading ? `${tests.length} test${tests.length === 1 ? "" : "s"} in this batch` : "Scheduled tests by batch"}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setInsightsOpen(true)}
              disabled={!selectedBatchId}
              className="h-10 gap-2"
              title="What this batch's online tests say: re-teach list, groups, questions to review"
            >
              <BrainCircuitIcon className="size-4" />
              <span className="hidden sm:inline">Insights</span>
              <span className="sr-only sm:hidden">Batch insights</span>
            </Button>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" aria-label="More actions" className="size-10 p-0" disabled={remarking}>
                    <EllipsisVerticalIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl p-1.5">
                  <DropdownMenuItem className="h-10 cursor-pointer gap-2.5 rounded-lg" onSelect={remarkAll}>
                    <ListRestartIcon className="size-4" /> Re-mark all tests
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="outline"
              onClick={refresh}
              disabled={!selectedBatchId || loading}
              aria-label="Refresh"
              className="size-10 p-0"
            >
              <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
            </Button>
          </>
        }
      />

      {isAdmin && remarkJob.job && (
        <JobProgress
          job={remarkJob.job}
          label="Re-marking tests"
          onCancel={() => remarkJob.cancel().catch((err) => toast.error(apiErrorMsg(err, "Couldn't cancel")))}
          onClear={() => remarkJob.clear().catch((err) => toast.error(apiErrorMsg(err, "Couldn't clear")))}
        />
      )}

      <SelectCompact
        label="Batch"
        options={batches.map((batch) => ({ label: batch.name, value: batch._id }))}
        onChange={pickBatch}
        value={selectedBatchId}
        loading={batchesLoading}
        className="w-full sm:w-80"
        placeholder="Select a batch"
      />

      {content()}

      {viewPaperId && (
        <ViewPaperSheet
          paperId={viewPaperId}
          open={Boolean(viewPaperId)}
          onOpenChange={(open) => {
            if (!open) setViewPaperId(null);
          }}
        />
      )}
      {studentsTest && selectedBatchId && (
        <TestStudentsSheet
          key={studentsTest._id}
          test={studentsTest}
          batchId={selectedBatchId}
          open={Boolean(studentsTest)}
          onOpenChange={(open) => !open && setStudentsTest(null)}
        />
      )}
      {retest && (
        <SchedulePaperSheet
          key={retest.testId}
          paperId={retest.paperId}
          initial={{ batchId: retest.batchId, studentIds: retest.studentIds, duration: retest.duration }}
          open={Boolean(retest)}
          onOpenChange={(open) => !open && setRetest(null)}
        />
      )}
      {viewScheduleResult && selectedBatchId && (
        <ViewResultSheet
          studentIds={viewScheduleResult.students?.map(String)}
          title={`Result - ${viewScheduleResult.paper?.title ?? ""}`}
          batchId={selectedBatchId}
          scheduleId={viewScheduleResult._id}
          open={Boolean(viewScheduleResult)}
          onOpenChange={(open) => {
            if (!open) setViewScheduleResult(null);
          }}
        />
      )}
      {analyzerId && (
        <QuestionAnalyzerSheet
          scheduleId={analyzerId}
          title={analyzerTitle || undefined}
          open={Boolean(analyzerId)}
          onOpenChange={(open) => {
            if (!open) setAnalyzerId(null);
          }}
        />
      )}
      {insightsOpen && selectedBatchId && (
        <BatchInsightsWindow
          open={insightsOpen}
          onOpenChange={setInsightsOpen}
          batchId={selectedBatchId}
          batchName={batches.find((b) => b._id === selectedBatchId)?.name ?? "Batch"}
        />
      )}
    </main>
  );
};

export default OnlineTestPage;
