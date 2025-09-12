"use client";

import { api, ENDPOINT } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { TBatch } from "@/models/Batch";

type UseBatchesProps = {
  withCount?: boolean;
};

type TBatchWithCount = TBatch & {
  totalStudents: number;
};

const useBatches = ({ withCount }: UseBatchesProps = {}) => {
  const [batches, setBatches] = useState<TBatchWithCount[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    const res = await api.get(ENDPOINT.batches, {
      params: { withCount },
    });
    setBatches(res.data.batches);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  return { batches, loading, refreshBatches: fetchBatches };
};

export default useBatches;
