"use client";

import useSWR from "swr";
import { api, ENDPOINT } from "@/lib/api";
import { LIST_SWR, swrError, swrLoading } from "@/lib/swr";
import { TAnswerSheet } from "@/models/AnswerSheet";

type Props = {
  scheduleId?: string;
};

type TAnswerSheetsRes = {
  results: TAnswerSheet[];
};

const useAnswerSheets = ({ scheduleId }: Props) => {
  const swr = useSWR(
    scheduleId ? ["answer-sheets", scheduleId] : null,
    async () => (await api.get(ENDPOINT.answerSheets, { params: { scheduleId } }))?.data?.data as TAnswerSheetsRes,
    LIST_SWR
  );
  return {
    answerSheets: swr.data ?? null,
    loading: swrLoading(swr),
    error: swrError(swr.error, "Failed to fetch answer sheets") ?? null,
    refresh: () => swr.mutate(),
  };
};

export default useAnswerSheets;
