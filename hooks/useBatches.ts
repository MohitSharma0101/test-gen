"use client";

import { api, ENDPOINT } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { TBatch } from "@/models/Batch";
import { toast } from "@/components/ui/use-toast";

type UseBatchesProps = {
  withCount?: boolean;
  archivedOnly?: boolean;
};

type TBatchWithCount = TBatch & {
  totalStudents: number;
};

const useBatches = ({ withCount, archivedOnly }: UseBatchesProps = {}) => {
  const [batches, setBatches] = useState<TBatchWithCount[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    const res = await api.get(ENDPOINT.batches, {
      params: { withCount, archivedOnly },
    });
    setBatches(res.data.batches);
    setLoading(false);
  }, [withCount, archivedOnly]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

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
    refreshBatches: fetchBatches,
    deleteBatch,
    setBatchArchived,
  };
};

export default useBatches;
