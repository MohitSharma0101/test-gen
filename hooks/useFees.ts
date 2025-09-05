"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ENDPOINT } from "@/lib/api";
import { TUserWithFeeSummary } from "@/models/User";

type Props = {
  batchId?: string;
};

type TFeesRes = {
  users: TUserWithFeeSummary[];
};

const useFees = ({ batchId }: Props) => {
  const [fees, setFees] = useState<TFeesRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFees = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.get(ENDPOINT.feesBatch, {
        params: { batchId },
      });
      setFees(res?.data?.data as TFeesRes);
    } catch (err: any) {
      setError(err.message ?? "Failed to fetch fees");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  return { fees, loading, error, refresh: fetchFees };
};

export default useFees;
