"use client";

import React, { useState } from "react";
import AddBatchSheet from "@/components/sheets/add-batch-sheet";
import useBatches from "@/hooks/useBatches";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";
import { PlusIcon } from "lucide-react";
import { TBatch } from "@/models/Batch";
import ViewBatchSheet from "@/components/sheets/view-batch-sheet";

type Props = {};

const BatchPage = (props: Props) => {
  const { batches, loading, refreshBatches } = useBatches({
    populateUsers: true,
  });
  const [selectedBatch, setSelectedBatch] = useState<TBatch>();
  const [openAddBatchSheet, setOpenAddBatchSheet] = useState(false);
  const [openViewBatchSheet, setOpenViewBatchSheet] = useState(false);

  return (
    <div className="flex-1 rounded">
      <div className="rounded h-[52px] px-6 border border-slate-200 bg-slate-300 text-sm font-medium flex items-center justify-between">
        BATCHES
        <Button
          variant={"outline"}
          className="p-2 w-fit h-fit bg-white"
          onClick={() => {
            setSelectedBatch(undefined);
            setOpenAddBatchSheet(true);
          }}
        >
          <PlusIcon className="w-4 h-4" />
          Add Batch
        </Button>
      </div>
      <div className="px-6 py-3">
        {loading ? (
          <Loader2Icon className="w-10 h-10 animate-spin mx-auto" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {batches.map((batch) => (
              <div
                key={batch.name}
                className="w-full md:w-[300px] p-4 rounded-lg border border-slate-200 bg-white flex items-center justify-between cursor-pointer hover:border-slate-500"
                onClick={() => {
                  setSelectedBatch(batch);
                  setOpenViewBatchSheet(true);
                }}
              >
                <div>
                  <p className="text-sm font-medium">{batch.name}</p>
                  <p className="text-sm text-slate-500">
                    {batch.userIds.length} students
                  </p>
                </div>
                <Button variant="outline" size="sm" className="rounded-full">
                  <PencilIcon className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      {openAddBatchSheet && (
        <AddBatchSheet
          onSuccess={refreshBatches}
          defaultBatch={selectedBatch}
          open={openAddBatchSheet}
          onOpenChange={(open) => {
            setOpenAddBatchSheet(open);
            if (!open) {
              setOpenViewBatchSheet(false);
            }
          }}
        />
      )}
      {openViewBatchSheet && (
        <ViewBatchSheet
          batch={selectedBatch}
          open={openViewBatchSheet}
          onOpenChange={setOpenViewBatchSheet}
          onEdit={() => {
            setOpenAddBatchSheet(true);
          }}
        />
      )}
    </div>
  );
};

export default BatchPage;
