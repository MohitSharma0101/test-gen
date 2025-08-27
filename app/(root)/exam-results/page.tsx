"use client";

import { AddResultSheet } from "@/components/sheets/add-result-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SelectCompact from "@/components/ui/select-compact";
import useBatches from "@/hooks/useBatches";
import useExamResults from "@/hooks/useExamResult";
import Clock from "@/lib/clock";
import { TExamResult } from "@/models/ExamResult";
import { PlusIcon } from "lucide-react";
import { Loader2Icon } from "lucide-react";
import { ChevronRightIcon } from "lucide-react";
import { SquareMousePointerIcon } from "lucide-react";
import React, { useState } from "react";

type Props = {};

const ExamResultsPage = (props: Props) => {
  const { batches } = useBatches({ populateUsers: true });
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const selectedBatch = batches.find((batch) => batch._id === selectedBatchId);
  const [selectedDate, setSelectedDate] = useState<string>();
  const [openResultSheet, setOpenResultSheet] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TExamResult | null>();

  const { examResults, loading, fetchExamResults } = useExamResults();

  const onSearch = async () => {
    fetchExamResults({
      batchId: selectedBatchId,
      date: selectedDate,
    });
  };
  const closeSheet = () => {
    setOpenResultSheet(false);
    setSelectedResult(null);
  };

  return (
    <div>
      <div className="rounded py-2 px-2 md:px-6 border border-slate-200 bg-slate-300 flex gap-x-4 items-center justify-between flex-wrap sticky top-0 ">
        <h1 className="py-2 text-sm font-bold flex items-center gap-x-2">
          RESULTS
        </h1>
        {
          <Button
            disabled={!selectedBatchId || !selectedDate}
            onClick={() => setOpenResultSheet(true)}
          >
            Add <PlusIcon className="size-4 ml-2" />
          </Button>
        }
      </div>

      <div className="max-w-[700px] mx-auto my-3 px-2">
        <div className="py-2 flex items-center justify-between flex-wrap gap-2 md:gap-4">
          <SelectCompact
            options={batches.map((batch) => ({
              label: batch.name,
              value: batch._id,
            }))}
            onChange={(value) => {
              setSelectedBatchId(value);
            }}
            value={selectedBatchId}
            className="flex-grow lg:w-[300px]"
            placeholder="Select a batch"
          />
          <Input
            type="date"
            className="w-fit"
            max={Clock.getDate()}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <Button size="sm" onClick={onSearch} disabled={loading}>
            Search
          </Button>
        </div>
        <div className="flex flex-col rounded-md overflow-auto border bg-white mt-2">
          {loading ? (
            <Loader2Icon className="w-5 h-5 animate-spin mx-auto my-14" />
          ) : examResults.length > 0 ? (
            examResults?.map((result) => (
              <div
                key={result._id}
                onClick={() => {
                  setOpenResultSheet(true);
                  setSelectedResult(result);
                }}
                className="p-4 flex items-center cursor-pointer border-b last:border-none hover:bg-slate-50"
              >
                {result.name}
                <span className="text-slate-600 text-sm ml-2">
                  {Clock.getDateInFormat(result.date)} | {result.subject}
                </span>
                <ChevronRightIcon className="size-4 ml-auto" />
              </div>
            ))
          ) : (
            <div className="py-10 px-3 text-slate-400 text-sm md:text-base font-medium h-full flex gap-4 flex-col items-center justify-center">
              <SquareMousePointerIcon
                className="w-[100px] h-[100px]"
                strokeWidth={1.5}
              />
              Select a batch to view saved results.
            </div>
          )}
        </div>
      </div>
      {selectedBatch && selectedDate && openResultSheet && (
        <AddResultSheet
          open={openResultSheet}
          onOpenChange={() => closeSheet()}
          batch={selectedBatch}
          date={selectedDate}
          defaultExamResult={selectedResult}
          onSubmit={() => {
            closeSheet();
            onSearch();
          }}
        />
      )}
    </div>
  );
};

export default ExamResultsPage;
