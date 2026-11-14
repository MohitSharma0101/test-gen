"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArchiveIcon, ArrowLeftIcon } from "lucide-react";
import ViewBatchSheet from "@/components/sheets/view-batch-sheet";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/state-message";
import useBatches, { TBatchWithCount } from "@/hooks/useBatches";
import { cn } from "@/lib/utils";
import { BATCH_TONE, BatchGrid } from "../_batch-grid";

const ArchivedBatchesPage = () => {
  const { batches, loading, error, refreshBatches, setBatchArchived } = useBatches({ withCount: true, archivedOnly: true });
  const [selectedBatch, setSelectedBatch] = useState<TBatchWithCount>();
  const [openView, setOpenView] = useState(false);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 pb-12 pt-5 sm:px-6">
      <PageHeader
        icon={<ArchiveIcon />}
        tone={BATCH_TONE}
        title="Archived batches"
        description="Hidden from lists; students keep their batch. Restore to use one again."
        actions={
          <Link href="/batch" className={cn(buttonVariants({ variant: "outline" }), "gap-2")} aria-label="Back to batches">
            <ArrowLeftIcon className="size-4" />
            <span className="hidden sm:inline">Batches</span>
          </Link>
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
        empty={
          <EmptyState
            className="rounded-2xl border bg-card py-12"
            tone={BATCH_TONE}
            icon={<ArchiveIcon />}
            title="No archived batches"
            description="Batches you archive will appear here."
          />
        }
      />

      {openView && selectedBatch && (
        <ViewBatchSheet
          batch={selectedBatch}
          isArchived
          open={openView}
          onOpenChange={setOpenView}
          onUnarchive={async () => {
            try {
              await setBatchArchived(selectedBatch._id, false);
              setOpenView(false);
            } catch {
              // Toast shown by the hook
            }
          }}
        />
      )}
    </main>
  );
};

export default ArchivedBatchesPage;
