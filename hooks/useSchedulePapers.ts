"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ENDPOINT } from "@/lib/api";
import { TSchedulePaper } from "@/models/SchedulePaper";

type Props = {
    batchId?: string;
};

type TSchedulePapersRes = {
    schedulePapers: TSchedulePaper[];
};

const useSchedulePapers = ({ batchId }: Props) => {
    const [schedulePapersRes, setSchedulePapersRes] = useState<TSchedulePapersRes | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSchedulePapers = useCallback(async () => {
        if (!batchId) return;
        setLoading(true);
        setError(null);

        try {
            const res = await api.get(ENDPOINT.schedulePaper, {
                params: { batchId },
            });

            setSchedulePapersRes(res?.data?.data as TSchedulePapersRes);
        } catch (err: any) {
            setError(err.message ?? "Failed to fetch schedule papers");
        } finally {
            setLoading(false);
        }
    }, [batchId]);

    useEffect(() => {
        fetchSchedulePapers();
    }, [fetchSchedulePapers]);

    return { schedulePapersRes, loading, error, refresh: fetchSchedulePapers };
};

export default useSchedulePapers;
