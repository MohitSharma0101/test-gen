"use client";

import { PAPER_DURATION_OPTIONS } from "@/data/const";
import LabelInput from "../ui/label-input";
import SelectCompact from "../ui/select-compact";
import { Sheet, SheetContent } from "../ui/sheet";
import { Button } from "../ui/button";
import useBatches from "@/hooks/useBatches";
import { useState } from "react";
import { toast } from "../ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import { TSchedulePaper } from "@/models/SchedulePaper";

type Props = {
  paperId: string;
  open: boolean;
  onOpenChange: (opne: boolean) => void;
};

export const SchedulePaperSheet = ({ paperId, open, onOpenChange }: Props) => {
  const { batches } = useBatches();
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const [payload, setPayload] = useState<Partial<TSchedulePaper>>({
    duration: Number(PAPER_DURATION_OPTIONS[0].value),
  });

  const isInvalid =
    !payload.startTime ||
    !payload.endTime ||
    !payload.duration ||
    !selectedBatchId;

  const onSubmit = async () => {
    try {
      if (isInvalid) {
        toast({
          title: "All fields are mandatory!",
          variant: "destructive",
        });
        return;
      }
      await api.post(ENDPOINT.schedulePaper, {
        paperId,
        duration: Number(payload.duration),
        startTime: payload.startTime,
        endTime: payload.endTime,
        batchId: selectedBatchId,
      });
      toast({
        title: "Paper Schduled Successfully!",
        variant: "success",
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response.data.error,
        variant: "destructive",
      });
    }
  };

  const onPayloadChange = (key: keyof TSchedulePaper, value: string) => {
    setPayload((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0">
        <div className="text-base font-medium px-2 py-3 bg-gray-200">
          Schedule Paper
        </div>
        <div className="p-2 flex flex-col gap-2">
          <SelectCompact
            label="Batch"
            options={batches.map((batch) => ({
              label: batch.name,
              value: batch._id,
            }))}
            onChange={(value) => {
              setSelectedBatchId(value);
            }}
            value={selectedBatchId}
            className="flex-grow lg:w-[300px]"
            placeholder="Select a batch"
          />

          <LabelInput
            label="Start Time"
            type="datetime-local"
            className="w-fit"
            value={payload.startTime}
            onChange={(e) => onPayloadChange("startTime", e.target.value)}
          />
          <LabelInput
            label="Expiry Time"
            type="datetime-local"
            className="w-fit"
            disabled={!payload.startTime}
            min={payload.startTime}
            value={payload.endTime}
            onChange={(e) => onPayloadChange("endTime", e.target.value)}
          />
          <SelectCompact
            label="Duration"
            options={PAPER_DURATION_OPTIONS}
            className="w-[200px]"
            placeholder="Select Duration"
            value={String(payload.duration)}
            onChange={(value) => onPayloadChange("duration", value)}
          />
          <Button disabled={isInvalid} className="mt-4" onClick={onSubmit}>
            Submit
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
