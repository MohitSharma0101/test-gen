"use client";

import React, { useEffect, useState } from "react";
import { ChevronRightIcon, PlusIcon, TrophyIcon, UsersIcon, XIcon } from "lucide-react";
import { AddResultSheet } from "@/components/sheets/add-result-sheet";
import { Button } from "@/components/ui/button";
import SelectCompact from "@/components/ui/select-compact";
import { DatePicker } from "@/components/ui/date-picker";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/state-message";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTE_GROUPS } from "@/data/routes";
import useBatches from "@/hooks/useBatches";
import useExamResults from "@/hooks/useExamResult";
import Clock from "@/lib/clock";
import { cn } from "@/lib/utils";
import { TBatch } from "@/models/Batch";
import { TExamResult } from "@/models/ExamResult";

const TONE = ROUTE_GROUPS.daily.tile;

type TOpenResultSheet = {
  isOpen: boolean;
  batch: TBatch;
  date: string;
  result?: TExamResult;
};

const ExamResultsPage = () => {
  const { batches, loading: batchesLoading } = useBatches();
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const selectedBatch = batches?.find((batch) => batch._id === selectedBatchId);
  const [selectedDate, setSelectedDate] = useState<string>();
  const [openResultSheet, setOpenResultSheet] = useState<TOpenResultSheet>();
  const [searched, setSearched] = useState(false);

  const { examResults, loading, error, fetchExamResults } = useExamResults();
  const today = Clock.getDate();

  const search = () => {
    if (!selectedBatchId) return;
    setSearched(true);
    fetchExamResults({ batchId: selectedBatchId, date: selectedDate });
  };

  // Searching used to need its own button; it now follows the filters
  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatchId, selectedDate]);

  const closeSheet = () => setOpenResultSheet(undefined);

  // A result is entered for a batch on a specific exam date
  const canAdd = Boolean(selectedBatch && selectedDate);
  const onAddResult = () => {
    if (selectedBatch && selectedDate) {
      setOpenResultSheet({ isOpen: true, batch: selectedBatch, date: selectedDate });
    }
  };

  const onViewResult = (result: TExamResult) => {
    const batch = batches.find((b) => b._id === result.batchId);
    if (!batch) return;
    setOpenResultSheet({ isOpen: true, batch, date: Clock.getDateInFormat(result.date), result });
  };

  const content = () => {
    if (!selectedBatchId) {
      return (
        <EmptyState
          className="rounded-2xl border bg-card py-12"
          tone={TONE}
          icon={<UsersIcon />}
          title="Pick a batch"
          description="Its saved results will show here."
        />
      );
    }
    if (error) {
      return <ErrorState message="Couldn't load results." onRetry={search} className="rounded-2xl border bg-card py-12" />;
    }
    if ((loading || !searched) && examResults.length === 0) {
      return (
        <div className="space-y-2" aria-busy="true" aria-label="Loading results">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      );
    }
    if (examResults.length === 0) {
      return (
        <EmptyState
          className="rounded-2xl border bg-card py-12"
          tone={TONE}
          icon={<TrophyIcon />}
          title={selectedDate ? "No results on this date" : "No results for this batch yet"}
          description={canAdd ? "Add the marks for this exam." : "Pick the exam date to add a result."}
          action={
            canAdd ? (
              <Button variant="brand" onClick={onAddResult} className="gap-2">
                <PlusIcon className="size-4" /> Add result
              </Button>
            ) : undefined
          }
        />
      );
    }
    return (
      <ul className={cn("space-y-2", loading && "opacity-60 transition-opacity")}>
        {examResults.map((result) => (
          <li key={result._id}>
            <button
              type="button"
              onClick={() => onViewResult(result)}
              className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:border-brand/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", TONE)}>
                <TrophyIcon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{result.name || "Untitled result"}</span>
                <span className="block text-xs text-muted-foreground">
                  {result.date ? Clock.getDateInFormat(result.date) : "—"}
                  {result.subject ? ` · ${result.subject}` : ""}
                  {result.totalMarks ? ` · out of ${result.totalMarks}` : ""}
                </span>
              </span>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-12 pt-5 sm:px-6">
      <PageHeader
        icon={<TrophyIcon />}
        tone={TONE}
        title="Results"
        description={
          selectedBatchId && searched && !loading
            ? `${examResults.length} result${examResults.length === 1 ? "" : "s"}${selectedDate ? " on this date" : ""}`
            : "Enter and view exam results"
        }
        actions={
          <Button
            variant="brand"
            onClick={onAddResult}
            disabled={!canAdd}
            title={canAdd ? undefined : "Pick a batch and the exam date first"}
            className="h-10 gap-2"
          >
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">Add result</span>
            <span className="sr-only sm:hidden">Add result</span>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
        <SelectCompact
          label="Batch"
          options={batches.map((batch) => ({ label: batch.name, value: batch._id }))}
          onChange={setSelectedBatchId}
          value={selectedBatchId}
          loading={batchesLoading}
          className="col-span-2 min-w-0 sm:w-72"
          placeholder="Select a batch"
        />
        <div className="flex min-w-0 items-end gap-1 sm:w-64">
          <DatePicker
            label="Exam date"
            value={selectedDate}
            max={today}
            today={today}
            todayLabel="Today"
            placeholder="Any date"
            onChange={setSelectedDate}
            className="min-w-0 flex-1"
          />
          {selectedDate && (
            <Button
              variant="ghost"
              onClick={() => setSelectedDate(undefined)}
              aria-label="Show results from any date"
              title="Any date"
              className="size-10 shrink-0 p-0"
            >
              <XIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {content()}

      {openResultSheet && (
        <AddResultSheet
          open={openResultSheet.isOpen}
          onOpenChange={() => closeSheet()}
          batch={openResultSheet.batch}
          date={openResultSheet.date}
          defaultExamResult={openResultSheet.result}
          onSubmit={() => {
            closeSheet();
            search();
          }}
        />
      )}
    </main>
  );
};

export default ExamResultsPage;
