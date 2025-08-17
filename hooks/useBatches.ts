"use client";

import { api, ENDPOINT } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { TBatch } from "@/models/Batch";

type UseBatchesProps = {
  populateUsers?: boolean;
};

const useBatches = ({ populateUsers }: UseBatchesProps = {}) => {
  const [batches, setBatches] = useState<TBatch[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    const res = await api.get(ENDPOINT.batches, {
      params: { populateUsers },
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
