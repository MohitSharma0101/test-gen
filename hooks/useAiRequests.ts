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

/** One request with its drafts. `gone` = finished and removed. */
export function useAiRequest(id: string) {
  const swr = useSWR(["ai-requests", id], async () => ((await api.get(`ai-requests/${id}`))?.data?.data?.request ?? null) as TAiRequestDetail | null, {
    ...LIST_SWR,
    refreshInterval: (r) => (r?.status === "running" ? 30_000 : 0),
  });
  const status = (swr.error as { status?: number } | undefined)?.status;
  return {
    request: swr.data ?? null,
    loading: swr.isLoading,
    gone: status === 404,
    error: status === 404 ? undefined : swrError(swr.error, "Couldn't load this request"),
    refresh: () => swr.mutate(),
  };
}
