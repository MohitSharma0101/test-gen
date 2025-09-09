"use client";

import { toast } from "@/components/ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import { fetchAttendance, TAttendanceRes } from "@/service/core.service";
import { useCallback, useEffect, useState } from "react";

type config = {
  _id?: string;
  batchId?: string;
  date?: string;
};

const useAttendance = ({ batchId, date, _id }: config = {}) => {
  const [data, setData] = useState<TAttendanceRes["data"]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const attendance = data?.attendance;
  const users = data?.users;

  const getAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAttendance(batchId, date);
      if (res?.data?.data) setData(res?.data?.data);
    } catch (err) {
      console.log(err);
      setError("Unable to fetch attendance.");
    } finally {
      setLoading(false);
    }
  }, [batchId, date]);

  useEffect(() => {
    getAttendance();
  }, [getAttendance]);

  const markAttendance = async (absentUsers: string[]) => {
    try {
      await api.post(ENDPOINT.attendance, {
        _id: attendance?._id,
        batch: batchId,
        absentUsers,
        date,
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
