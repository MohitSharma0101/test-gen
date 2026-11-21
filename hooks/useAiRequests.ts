"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { LIST_SWR, swrError, swrLoading } from "@/lib/swr";
import type { TAiRequestSummary } from "@/lib/aiRequests";
import type { TAiRequest } from "@/models/AiRequest";

export type TAiRequestDetail = Omit<TAiRequest, "target"> & {
  target: { book: { _id: string; title: string } | null; chapter: { _id: string; title: string; course?: string; subject?: string } | null };
};

/** All AI requests, newest first, with draft counts. */
export function useAiRequests() {
  const swr = useSWR(["ai-requests"], async () => ((await api.get("ai-requests"))?.data?.data?.requests ?? []) as TAiRequestSummary[], {
    ...LIST_SWR,
    // A request being generated changes on its own: check every 30 s
    refreshInterval: (rows) => (rows?.some((r) => r.status === "running") ? 30_000 : 0),
  });
  return { requests: swr.data ?? [], loading: swrLoading(swr), firstLoad: swr.isLoading, error: swrError(swr.error, "Couldn't load requests"), refresh: () => swr.mutate() };
}

/** A "check" request also brings what its review screen needs. */
export type TCheckPaperQuestion = { _id: string; text: string; ans: string; mark?: number; chapter?: { title: string } };
export type TCheckContext = {
  paper: { _id: string; title: string; questions: TCheckPaperQuestion[] } | null;
  students: { _id: string; name: string }[];
  batch: { _id: string; name: string } | null;
};

export type TMadePaper = { _id: string; title: string; status: string; questions: number };

/** One request with its drafts. `gone` = finished and removed. */
export function useAiRequest(id: string) {
  const swr = useSWR(
    ["ai-requests", id],
    async () => {
      const data = (await api.get(`ai-requests/${id}`))?.data?.data;
      return data ? ({ ...data, request: data.request ?? null } as { request: TAiRequestDetail | null } & Partial<TCheckContext>) : null;
    },
    { ...LIST_SWR, refreshInterval: (r) => (r?.request?.status === "running" ? 30_000 : 0) }
  );
  const status = (swr.error as { status?: number } | undefined)?.status;
  return {
    request: swr.data?.request ?? null,
    // "paper": the Draft paper it made (when finished)
    madePaper: ((swr.data as { madePaper?: TMadePaper } | null)?.madePaper ?? null) as TMadePaper | null,
    check: swr.data?.request?.type === "check" ? ({ paper: swr.data.paper ?? null, students: swr.data.students ?? [], batch: swr.data.batch ?? null } as TCheckContext) : null,
    loading: swr.isLoading,
    gone: status === 404,
    error: status === 404 ? undefined : swrError(swr.error, "Couldn't load this request"),
    refresh: () => swr.mutate(),
  };
}
