"use client";

import useSWR from "swr";
import { api, ENDPOINT } from "@/lib/api";
import { LIST_SWR, swrError, swrLoading } from "@/lib/swr";
import { TUserWithFeeSummary } from "@/models/User";

type Props = {
  batchId?: string;
};

type TFeesRes = {
  users: TUserWithFeeSummary[];
};

// Keyed by batch, so another batch's rows are never shown while switching
const useFees = ({ batchId }: Props) => {
  const swr = useSWR(
    batchId ? ["fees", batchId] : null,
    async () => ({ users: (await api.get(ENDPOINT.feesBatch, { params: { batchId } }))?.data?.data?.users ?? [] }) as TFeesRes,
    LIST_SWR
  );
  return {
    fees: swr.data ?? null,
    loading: swrLoading(swr),
    error: swrError(swr.error, "Failed to fetch fees") ?? null,
    refresh: () => swr.mutate(),
  };
};

export default useFees;
