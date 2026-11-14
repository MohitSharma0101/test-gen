"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArchiveIcon, GraduationCapIcon, PlusIcon } from "lucide-react";
import AddBatchSheet from "@/components/sheets/add-batch-sheet";
import ViewBatchSheet from "@/components/sheets/view-batch-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/state-message";
import useBatches, { TBatchWithCount } from "@/hooks/useBatches";
import { cn } from "@/lib/utils";
import { BATCH_TONE, BatchGrid } from "./_batch-grid";

const BatchPage = () => {
  const { batches, loading, error, refreshBatches, setBatchArchived } = useBatches({ withCount: true });
  const [selectedBatch, setSelectedBatch] = useState<TBatchWithCount>();
  const [openEdit, setOpenEdit] = useState(false);
  const [openView, setOpenView] = useState(false);

  const students = batches.reduce((sum, b) => sum + (b.totalStudents ?? 0), 0);

  const openForm = (batch?: TBatchWithCount) => {
    // One panel at a time: the form replaces the batch details
    setOpenView(false);
    setSelectedBatch(batch);
    setOpenEdit(true);
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 pb-12 pt-5 sm:px-6">
      <PageHeader
        icon={<GraduationCapIcon />}
        tone={BATCH_TONE}
        title="Batches"
        description={
          batches.length
            ? `${batches.length} active batch${batches.length === 1 ? "" : "es"} · ${students} student${students === 1 ? "" : "s"}`
            : "Create batches and assign students"
        }
        actions={
          <>
            <Link href="/batch/archive" className={cn(buttonVariants({ variant: "outline" }), "gap-2")} aria-label="Archived batches">
              <ArchiveIcon className="size-4" />
              <span className="hidden sm:inline">Archived</span>
            </Link>
            <Button variant="brand" onClick={() => openForm()} className="gap-2" aria-label="Add batch">
              <PlusIcon className="size-4" />
              <span className="hidden sm:inline">Add batch</span>
            </Button>
          </>
        }
      />

      <BatchGrid
        batches={batches}
        loading={loading}
        error={error}
        onRetry={refreshBatches}
        onOpen={(batch) => {
          setSelectedBatch(batch);
          setOpenView(true);
        }}
        onEdit={openForm}
        empty={
          <EmptyState
            className="rounded-2xl border bg-card py-12"
            tone={BATCH_TONE}
            icon={<GraduationCapIcon />}
            title="No batches yet"
            description="Create a batch, then add its students."
            action={
              <Button variant="brand" onClick={() => openForm()} className="gap-2">
                <PlusIcon className="size-4" /> Add batch
              </Button>
            }
          />
        }
      />

      {openEdit && (
        <AddBatchSheet
          // Fresh form state for each batch
          key={selectedBatch?._id ?? "new"}
          defaultBatch={selectedBatch}
          open={openEdit}
          onOpenChange={setOpenEdit}
          onSuccess={refreshBatches}
        />
      )}
      {openView && selectedBatch && (
        <ViewBatchSheet
          batch={selectedBatch}
          open={openView}
          onOpenChange={setOpenView}
          onEdit={() => openForm(selectedBatch)}
          onArchive={async () => {
            try {
              await setBatchArchived(selectedBatch._id, true);
              setOpenView(false);
            } catch {
              // The hook already showed the error toast; keep the panel open
            }
          }}
        />
      )}
    </main>
  );
};

export default BatchPage;
