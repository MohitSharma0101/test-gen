"use client";

import React, { useEffect, useState } from "react";
import { CalendarCheck2Icon, CheckIcon, InfoIcon, Loader2Icon, ScanFaceIcon, UsersIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import SelectCompact from "@/components/ui/select-compact";
import { DatePicker } from "@/components/ui/date-picker";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/state-message";
import { Skeleton } from "@/components/ui/skeleton";
import { WA_MSG } from "@/data/wa-msg";
import { ROUTE_GROUPS } from "@/data/routes";
import useAttendance from "@/hooks/useAttendance";
import useBatches from "@/hooks/useBatches";
import WhatsappOutlineIcon from "@/icons/whatsapp-outline";
import Clock from "@/lib/clock";
import { cn, redirectToWhatsapp } from "@/lib/utils";
import FaceAttendanceSheet from "@/components/sheets/face-attendance-sheet";
import { toast } from "@/components/ui/use-toast";
import { TFaceAudit } from "@/models/Attendance";

const TONE = ROUTE_GROUPS.daily.tile;

const AttendancePage = () => {
  const { batches, loading: batchesLoading } = useBatches();
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const selectedBatch = batches.find((batch) => batch._id === selectedBatchId);
  const [absentUsers, setAbsentUsers] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(Clock.getDate());
  const [messageParents, setMessageParents] = useState(false);
  const [faceSheetOpen, setFaceSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Set only by the photo flow. Submitted alongside the final absent list so
  // the machine's suggestion can be compared against the teacher's decision.
  const [faceAudit, setFaceAudit] = useState<TFaceAudit>();

  const today = Clock.getDate();
  // Past attendance is shown, not edited
  const readOnly = selectedDate !== today;

  const { attendance, users, loading, error, refresh, markAttendance } = useAttendance({
    batchId: selectedBatchId,
    date: selectedDate,
  });

  useEffect(() => {
    setAbsentUsers((attendance?.absentUsers as string[]) || []);
  }, [attendance]);

  const students = users ?? [];
  const absentCount = absentUsers.filter((id) => students.some((s) => s._id === id)).length;
  const presentCount = students.length - absentCount;

  const pickBatch = (value: string) => {
    setSelectedBatchId(value);
    setAbsentUsers([]);
    setFaceAudit(undefined);
  };

  const toggle = (user: (typeof students)[number]) => {
    if (readOnly) return;
    const isAbsent = absentUsers.includes(user._id);
    setAbsentUsers(isAbsent ? absentUsers.filter((id) => id !== user._id) : [...absentUsers, user._id]);
    // Marking absent (not un-marking) opens the parent message when switched on
    if (messageParents && !isAbsent && user.parentPhone && selectedBatch) {
      redirectToWhatsapp(user.parentPhone, WA_MSG.absent(user.name, Clock.getDateInFormat(), selectedBatch.name));
    }
  };

  const onSubmit = async () => {
    setSubmitting(true);
    await markAttendance(absentUsers, faceAudit);
    setSubmitting(false);
    // As before: clear the batch so the next class starts fresh
    setSelectedBatchId("");
    setAbsentUsers([]);
    setFaceAudit(undefined);
  };

  const showList = Boolean(selectedBatchId) && Boolean(users) && !error;

  const content = () => {
    if (!selectedBatchId) {
      return (
        <EmptyState
          className="rounded-2xl border bg-card py-12"
          tone={TONE}
          icon={<UsersIcon />}
          title="Pick a batch"
          description="Its students will show here to mark attendance."
        />
      );
    }
    if (error) {
      return <ErrorState message="Couldn't load this batch's attendance." onRetry={refresh} className="rounded-2xl border bg-card py-12" />;
    }
    if (!users || (loading && !attendance && students.length === 0)) {
      return (
        <div className="grid gap-2 lg:grid-cols-2" aria-busy="true" aria-label="Loading students">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      );
    }
    if (students.length === 0) {
      return (
        <EmptyState
          className="rounded-2xl border bg-card py-12"
          tone={TONE}
          icon={<UsersIcon />}
          title="No students in this batch"
          description="Add students to the batch from the Batches page."
        />
      );
    }
    return (
      <ul className={cn("grid gap-2 lg:grid-cols-2", loading && "opacity-60 transition-opacity")}>
        {students.map((user, index) => {
          const isAbsent = absentUsers.includes(user._id);
          return (
            <li key={user._id}>
              <button
                type="button"
                onClick={() => toggle(user)}
                disabled={readOnly}
                aria-pressed={isAbsent}
                aria-label={`${user.name}: ${isAbsent ? "absent" : "present"}${readOnly ? "" : ", tap to change"}`}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-xl border bg-card px-3 py-2 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-default motion-safe:active:scale-[0.99]",
                  isAbsent && "border-red-200 bg-red-50"
                )}
              >
                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{user.name}</span>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
                    isAbsent ? "bg-red-600 text-white" : "bg-emerald-50 text-emerald-700"
                  )}
                >
                  {isAbsent ? <XIcon className="size-3.5" aria-hidden="true" /> : <CheckIcon className="size-3.5" aria-hidden="true" />}
                  {isAbsent ? "Absent" : "Present"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <main className={cn("mx-auto w-full max-w-5xl space-y-4 px-4 pt-5 sm:px-6", showList && !readOnly ? "pb-28" : "pb-12")}>
      <PageHeader
        icon={<CalendarCheck2Icon />}
        tone={TONE}
        title="Attendance"
        description={
          showList && students.length
            ? `${absentCount} absent · ${presentCount} present · ${students.length} students`
            : "Tap a student to mark them absent"
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
        <SelectCompact
          label="Batch"
          options={batches.map((batch) => ({ label: batch.name, value: batch._id }))}
          onChange={pickBatch}
          value={selectedBatchId}
          loading={batchesLoading}
          className="col-span-2 min-w-0 sm:w-72"
          placeholder="Select a batch"
        />
        <DatePicker label="Date" value={selectedDate} max={today} today={today} onChange={setSelectedDate} todayLabel="Today" className="min-w-0 sm:w-56" />
        <div className="space-y-1">
          <p className="ml-1 text-xs font-medium">WhatsApp</p>
          <button
            type="button"
            role="switch"
            aria-checked={messageParents}
            onClick={() => setMessageParents((v) => !v)}
            title="Open a WhatsApp message to the parent when you mark someone absent"
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded-md border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:w-auto",
              messageParents ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "bg-background text-muted-foreground"
            )}
          >
            <WhatsappOutlineIcon className="size-4 shrink-0" />
            <span className="truncate">Message parents</span>
            <span
              className={cn("ml-auto h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors", messageParents ? "bg-emerald-500" : "bg-muted-foreground/30")}
              aria-hidden="true"
            >
              <span className={cn("block size-4 rounded-full bg-white shadow transition-transform", messageParents && "translate-x-4")} />
            </span>
          </button>
        </div>
      </div>

      {selectedBatchId && readOnly && (
        <p className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm text-muted-foreground">
          <InfoIcon className="size-4 shrink-0" aria-hidden="true" />
          Showing a past day. Attendance can only be changed for today.
        </p>
      )}
      {attendance?.updatedAt && showList && (
        <p className="text-xs text-muted-foreground">Last saved {Clock.getDateTimeInFormat(attendance.updatedAt)}</p>
      )}

      {content()}

      {/* Actions in thumb reach while marking a class */}
      {showList && !readOnly && students.length > 0 && (
        <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-xl items-center gap-2 rounded-2xl border bg-card p-2 shadow-2xl">
          <Button
            variant="outline"
            onClick={() => setFaceSheetOpen(true)}
            className="h-11 gap-2"
            title="Mark attendance from class photos"
          >
            <ScanFaceIcon className="size-4" /> Photos
          </Button>
          <Button variant="brand" onClick={onSubmit} disabled={submitting} className="h-11 flex-1 gap-2">
            {submitting && <Loader2Icon className="size-4 animate-spin" />}
            Submit · {absentCount} absent
          </Button>
        </div>
      )}

      <FaceAttendanceSheet
        open={faceSheetOpen}
        onOpenChange={setFaceSheetOpen}
        batchId={selectedBatchId}
        date={selectedDate}
        onApply={(absentUserIds, audit) => {
          setFaceAudit(audit);
          // Fills the list only. The teacher still reviews the rows and presses
          // Submit, so nothing is recorded without a human confirming it.
          setAbsentUsers(absentUserIds);
          toast({ title: `${absentUserIds.length} marked absent — review and Submit`, variant: "success" });
        }}
      />
    </main>
  );
};

export default AttendancePage;
