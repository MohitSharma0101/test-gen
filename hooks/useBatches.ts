"use client";

import { api, ENDPOINT } from "@/lib/api";
import { useCallback } from "react";
import useSWR from "swr";
import { LIST_SWR, swrError, swrLoading } from "@/lib/swr";
import { TBatch } from "@/models/Batch";
import { toast } from "@/components/ui/use-toast";

type UseBatchesProps = {
  withCount?: boolean;
  archivedOnly?: boolean;
};

export type TBatchWithCount = TBatch & {
  totalStudents: number;
};

const useBatches = ({ withCount, archivedOnly }: UseBatchesProps = {}) => {
  // Shared cache: the many pickers asking for batches make one request
  const swr = useSWR(
    ["batches", Boolean(withCount), Boolean(archivedOnly)],
    async () =>
      ((await api.get(ENDPOINT.batches, { params: { withCount, archivedOnly } }))?.data?.batches ?? []) as TBatchWithCount[],
    LIST_SWR
  );
  const batches = swr.data ?? [];
  const loading = swrLoading(swr);
  const error = swrError(swr.error, "Couldn't load batches");
  const fetchBatches = useCallback(() => swr.mutate(), [swr]);

  const deleteBatch = async (id: string) => {
    try {
      if (!id) {
        throw new Error("Batch id is required.");
      }
      await api.delete(ENDPOINT.batches, {
        params: { id },
      });
      await fetchBatches();
      toast({
        title: "Successfully deleted batch!",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: (err as Error)?.message || "Unable to delete batch!",
        variant: "destructive",
      });
    }
  };

  const setBatchArchived = async (id: string, archived: boolean) => {
    try {
      if (!id) {
        throw new Error("Batch id is required.");
      }
      await api.patch(ENDPOINT.batches, { _id: id, archived });
      await fetchBatches();
      toast({
        title: archived
          ? "Successfully archived batch!"
          : "Successfully restored batch!",
        variant: "success",
      });
    } catch (err) {
      toast({
        title:
          (err as Error)?.message ||
          (archived ? "Unable to archive batch!" : "Unable to restore batch!"),
        variant: "destructive",
      });
      throw err;
    }
  };

  return {
    batches,
    loading,
    error,
    refreshBatches: fetchBatches,
    deleteBatch,
    setBatchArchived,
  };
};

export default useBatches;
