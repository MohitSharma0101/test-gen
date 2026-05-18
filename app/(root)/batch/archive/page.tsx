"use client";

import React, { useState } from "react";
import useBatches from "@/hooks/useBatches";
import { Loader2Icon, ArchiveIcon, ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TBatch } from "@/models/Batch";
import ViewBatchSheet from "@/components/sheets/view-batch-sheet";
import Link from "next/link";

const ArchivedBatchesPage = () => {
  const { batches, loading, setBatchArchived } = useBatches({
    withCount: true,
    archivedOnly: true,
  });
  const [selectedBatch, setSelectedBatch] = useState<TBatch>();
  const [openViewBatchSheet, setOpenViewBatchSheet] = useState(false);

  return (
    <div className="flex-1 rounded">
      <div className="rounded h-[52px] px-6 border border-slate-200 bg-slate-300 text-sm font-medium flex items-center justify-between">
        <span className="flex items-center gap-2">
          <ArchiveIcon className="w-4 h-4" />
          ARCHIVED BATCHES
        </span>
        <Button variant="outline" className="p-2 w-fit h-fit bg-white" asChild>
          <Link href="/batch">
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to batches
          </Link>
        </Button>
      </div>
      <div className="px-6 py-3">
        {loading ? (
          <Loader2Icon className="w-10 h-10 animate-spin mx-auto" />
        ) : batches.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            No archived batches yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {batches.map((batch) => (
              <div
                key={batch._id}
                className="w-full md:w-[300px] p-4 rounded-lg border border-slate-200 bg-white flex items-center justify-between cursor-pointer hover:border-slate-500"
                onClick={() => {
                  setSelectedBatch(batch);
                  setOpenViewBatchSheet(true);
                }}
              >
                <div>
                  <p className="text-sm font-medium">{batch.name}</p>
                  <p className="text-xs text-slate-500">
                    {batch.totalStudents || 0} Students
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {openViewBatchSheet && (
        <ViewBatchSheet
          batch={selectedBatch}
          isArchived
          open={openViewBatchSheet}
          onOpenChange={setOpenViewBatchSheet}
          onUnarchive={async () => {
            if (!selectedBatch?._id) return;
            await setBatchArchived(selectedBatch._id, false);
            setOpenViewBatchSheet(false);
          }}
        />
      )}
    </div>
  );
};

export default ArchivedBatchesPage;
