"use client";

import { toast } from "@/components/ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import { TAttendance } from "@/models/Attendance";
import { fetchAttendance } from "@/service/core.service";
import { useCallback, useEffect, useState } from "react";

type config = {
  _id?: string;
  batchId?: string;
  date?: string;
};

const useAttendance = ({ batchId, date, _id }: config = {}) => {
  const [attendance, setAttendance] = useState<TAttendance>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const getAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAttendance(batchId, date);
      setAttendance(res?.data?.attendance);
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
      getAttendance();
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
    loading,
    error,
    refresh: getAttendance,
    markAttendance,
  };
};

export default useAttendance;
