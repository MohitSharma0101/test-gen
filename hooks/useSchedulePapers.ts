"use client";

import useSWR from "swr";
import { api, ENDPOINT } from "@/lib/api";
import { LIST_SWR, swrError, swrLoading } from "@/lib/swr";
import { TSchedulePaper } from "@/models/SchedulePaper";

type Props = {
  batchId?: string;
};

type TSchedulePapersRes = {
  schedulePapers: TSchedulePaper[];
};

const useSchedulePapers = ({ batchId }: Props) => {
  const swr = useSWR(
    batchId ? ["schedule-papers", batchId] : null,
    async () => (await api.get(ENDPOINT.schedulePaper, { params: { batchId } }))?.data?.data as TSchedulePapersRes,
    LIST_SWR
  );
  return {
    schedulePapersRes: swr.data ?? null,
    loading: swrLoading(swr),
    error: swrError(swr.error, "Failed to fetch schedule papers") ?? null,
    refresh: () => swr.mutate(),
  };
};

export default useSchedulePapers;
