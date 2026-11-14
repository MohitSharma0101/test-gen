"use client";

import { toast } from "@/components/ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import { fetchAttendance, TAttendanceRes } from "@/service/core.service";
import { TFaceAudit } from "@/models/Attendance";
import { useCallback } from "react";
import useSWR from "swr";
import { LIST_SWR, swrLoading } from "@/lib/swr";

type config = {
  _id?: string;
  batchId?: string;
  date?: string;
  shouldLoad?: boolean;
};

const useAttendance = ({ batchId, date, shouldLoad = true }: config = {}) => {
  // Keyed by batch + date: another day's list is never shown for this one
  const swr = useSWR(
    shouldLoad && batchId && date ? ["attendance", batchId, date] : null,
    async () => (await fetchAttendance(batchId!, date!))?.data?.data as TAttendanceRes["data"],
    LIST_SWR
  );
  const data = swr.data;
  const loading = swrLoading(swr);
  const error = swr.error ? "Unable to fetch attendance." : undefined;
  const getAttendance = useCallback(() => swr.mutate(), [swr]);

  const attendance = data?.attendance;
  const users = data?.users;

  // faceAudit is passed only when the photo flow produced this list, so the
  // machine's suggestion can be compared against what the teacher submitted.
  const markAttendance = async (
    absentUsers: string[],
    faceAudit?: TFaceAudit
  ) => {
    try {
      await api.post(ENDPOINT.attendance, {
        _id: attendance?._id,
        batch: batchId,
        absentUsers,
        date,
        ...(faceAudit ? { faceAudit } : {}),
      });

      toast({
        title: "Attendance marked successfully",
        variant: "success",
      });
    } catch (err) {
      console.log(err);
      toast({
        title: (err as any)?.message || "Unable to mark attendance",
        variant: "destructive",
      });
    }
  };

  return {
    attendance,
    users,
    loading,
    error,
    refresh: getAttendance,
    markAttendance,
  };
};

export default useAttendance;
