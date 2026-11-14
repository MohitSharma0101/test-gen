"use client";

import { useState } from "react";
import { CalendarClockIcon, Loader2Icon } from "lucide-react";
import { PAPER_DURATION_OPTIONS } from "@/data/const";
import { DateTimePicker } from "../ui/date-time-picker";
import SelectCompact from "../ui/select-compact";
import { Button } from "../ui/button";
import { ResponsiveDrawer } from "../ui/responsive-drawer";
import useBatches from "@/hooks/useBatches";
import { toast } from "../ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import { TSchedulePaper } from "@/models/SchedulePaper";

type Props = {
  paperId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// End time a picked end date starts with: an hour after the start, so the
// pair is valid without touching the time
const hourAfter = (start: string) => {
  const [h, m] = (start.split("T")[1] ?? "").split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "18:00";
  return `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// Schedule a saved paper as an online test for one batch.
export const SchedulePaperSheet = ({ paperId, open, onOpenChange }: Props) => {
  const { batches, loading: batchesLoading } = useBatches();
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [payload, setPayload] = useState<Partial<TSchedulePaper>>({
    duration: Number(PAPER_DURATION_OPTIONS[0].value),
  });

  const endBeforeStart = Boolean(
    payload.startTime && payload.endTime && String(payload.endTime) <= String(payload.startTime)
  );
  const isInvalid =
    !payload.startTime || !payload.endTime || !payload.duration || !selectedBatchId || endBeforeStart;

  const onSubmit = async () => {
    if (isInvalid || submitting) return;
    setSubmitting(true);
    try {
      await api.post(ENDPOINT.schedulePaper, {
        paperId,
        duration: Number(payload.duration),
        startTime: payload.startTime,
        endTime: payload.endTime,
        batchId: selectedBatchId,
      });
      toast({ title: "Test scheduled", variant: "success" });
      onOpenChange(false);
    } catch (err) {
      // The api client rejects with a plain Error carrying the server message
      toast({
        title: "Couldn't schedule the test",
        description: (err as Error)?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onPayloadChange = (key: keyof TSchedulePaper, value: string) =>
    setPayload((prev) => ({ ...prev, [key]: value }));

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule online test"
      description="Students in the batch can take it between the start and end time."
      footer={
        <Button
          variant="brand"
          disabled={isInvalid || submitting}
          onClick={onSubmit}
          className="h-11 w-full gap-2"
        >
          {submitting ? <Loader2Icon className="size-4 animate-spin" /> : <CalendarClockIcon className="size-4" />}
          Schedule test
        </Button>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        <SelectCompact
          label="Batch"
          options={batches.map((batch) => ({ label: batch.name, value: batch._id }))}
          onChange={setSelectedBatchId}
          value={selectedBatchId}
          loading={batchesLoading}
          className="w-full"
          placeholder="Select a batch"
        />
        <div className="grid gap-4">
          <DateTimePicker
            label="Starts"
            value={payload.startTime ?? ""}
            onChange={(v) => onPayloadChange("startTime", v)}
            min={new Date().toISOString()}
          />
          <DateTimePicker
            label="Ends"
            disabled={!payload.startTime}
            defaultTime={hourAfter(String(payload.startTime ?? ""))}
            min={payload.startTime ? String(payload.startTime) : undefined}
            value={payload.endTime ?? ""}
            onChange={(v) => onPayloadChange("endTime", v)}
          />
        </div>
        {endBeforeStart && <p className="-mt-2 text-xs font-medium text-red-700">End time must be after the start time.</p>}
        <SelectCompact
          label="Time to finish"
          options={PAPER_DURATION_OPTIONS}
          className="w-full sm:w-56"
          placeholder="Select duration"
          value={String(payload.duration)}
          onChange={(value) => onPayloadChange("duration", value)}
        />
      </div>
    </ResponsiveDrawer>
  );
};
