"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SelectCompact from "@/components/ui/select-compact";
import { WA_MSG } from "@/data/wa-msg";
import useAttendance from "@/hooks/useAttendance";
import useBatches from "@/hooks/useBatches";
import Clock from "@/lib/clock";
import { redirectToWhatsapp } from "@/lib/utils";
import { TUser } from "@/models/User";
import { Loader2Icon } from "lucide-react";
import { SquareMousePointerIcon } from "lucide-react";
import React, { useEffect, useState } from "react";

type Props = {};

const AttendancePage = (props: Props) => {
  const { batches } = useBatches({ populateUsers: true });
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const selectedBatch = batches.find((batch) => batch._id === selectedBatchId);
  const [absentUsers, setAbsentUsers] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(Clock.getDate());

  const isDisabled = selectedDate != Clock.getDate();

  const { attendance, loading, markAttendance } = useAttendance({
    batchId: selectedBatchId,
    date: selectedDate,
  });

  useEffect(() => {
    setAbsentUsers((attendance?.absentUsers as string[]) || []);
  }, [attendance]);

  const onSubmit = async () => {
    await markAttendance(absentUsers);
    setSelectedBatchId("");
    setAbsentUsers([]);
  };

  return (
    <div>
      <div className="rounded py-1 px-2 md:px-6 border border-slate-200 bg-slate-300 flex gap-x-4 items-center justify-between flex-wrap sticky top-0 z-[10]">
        <h1 className="py-2 text-sm font-bold flex items-center gap-x-2">
          ATTENDANCE
          {selectedBatch && (
            <span className="text-slate-600 font-medium">{`(${
              absentUsers.length || 0
            } absent out of ${selectedBatch.userIds.length})`}</span>
          )}
        </h1>
        <div className="py-2 flex items-center justify-between flex-wrap gap-2 md:gap-4">
          <SelectCompact
            options={batches.map((batch) => ({
              label: batch.name,
              value: batch._id,
            }))}
            onChange={(value) => {
              setSelectedBatchId(value);
              setAbsentUsers([]);
            }}
            value={selectedBatchId}
            className="flex-grow lg:w-[300px]"
            placeholder="Select a batch"
          />
          <Input
            type="date"
            className="w-fit"
            max={Clock.getDate()}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <Button size="sm" onClick={onSubmit} disabled={isDisabled}>
            Submit
          </Button>
        </div>
      </div>
      <div className="max-w-[700px] mx-auto my-3 px-2">
        {!selectedBatchId ? (
          <div className="py-10 px-3 text-slate-400 text-sm md:text-base font-medium h-full flex gap-4 flex-col items-center justify-center">
            <SquareMousePointerIcon
              className="w-[100px] h-[100px]"
              strokeWidth={1.5}
            />
            Select a batch to view attendance
          </div>
        ) : (
          <div className="my-3 bg-white rounded-lg border border-slate-200 divide-y divide-slate-200">
            {loading ? (
              <Loader2Icon className="w-5 h-5 animate-spin mx-auto my-14" />
            ) : (
              selectedBatch?.userIds
                ?.map((u) => u as TUser)
                ?.map((user, index) => {
                  const isAbsent = absentUsers.includes(user._id);
                  return (
                    <div
                      key={user._id}
                      className="py-2 px-3 flex items-center gap-2"
                    >
                      {index + 1}.
                      <div className="flex-1">
                        <p className="text-sm font-medium">{user.name}</p>
                      </div>
                      <Button
                        disabled={isDisabled}
                        variant={isAbsent ? "destructive" : "outline"}
                        size="sm"
                        className="rounded-full text-xs gap-1"
                        onClick={() => {
                          setAbsentUsers(
                            isAbsent
                              ? absentUsers.filter((id) => id !== user._id)
                              : [...absentUsers, user._id]
                          );
                          if (user.parentPhone && !isAbsent) {
                            // here we need to take inverse of isAbsent because the value is yet to be set in the state
                            redirectToWhatsapp(
                              user.parentPhone,
                              WA_MSG.absent(
                                user.name,
                                Clock.getDateInFormat(),
                                selectedBatch.name
                              )
                            );
                          }
                        }}
                      >
                        Absent
                      </Button>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
