"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { TJob } from "@/models/Job";

const ACTIVE = ["queued", "running"];

/**
 * The latest background job of one type (lib/jobs), polled every 3 s while
 * it runs. `onFinish` fires once when a job this page saw running ends, so
 * the page can refresh what the job changed.
 */
export default function useJob(type: string, onFinish?: (job: TJob) => void) {
  const { data, mutate } = useSWR(
    ["jobs", type],
    async () => ((await api.get("jobs", { params: { type } }))?.data?.data?.job ?? null) as TJob | null,
    {
      revalidateOnFocus: true,
      refreshInterval: (job) => (job && ACTIVE.includes(job.status) ? 3000 : 0),
    }
  );

  const seenRunning = useRef<string | null>(null);
  useEffect(() => {
    if (!data) return;
    if (ACTIVE.includes(data.status)) seenRunning.current = data._id;
    else if (seenRunning.current === data._id) {
      seenRunning.current = null;
      onFinish?.(data);
    }
  }, [data, onFinish]);

  const start = async (options?: Record<string, unknown>) => {
    const job = (await api.post("jobs", { type, options }))?.data?.data?.job as TJob;
    await mutate(job, { revalidate: false });
    return job;
  };
  const cancel = async () => {
    if (!data) return;
    await api.post(`jobs/${data._id}/cancel`);
    await mutate();
  };

  return { job: data ?? null, active: !!data && ACTIVE.includes(data.status), start, cancel, refresh: () => mutate() };
}
