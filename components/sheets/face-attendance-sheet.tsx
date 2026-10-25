"use client";

import React, { useEffect, useState } from "react";
import { Sheet, SheetContent } from "../ui/sheet";
import { Button } from "../ui/button";
import { toast } from "../ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import { CameraIcon, Loader2Icon, XIcon } from "lucide-react";
import { TFaceAudit } from "@/models/Attendance";

type Props = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  batchId?: string;
  date?: string;
  onApply: (_absentUserIds: string[], _audit: TFaceAudit) => void;
};

const MAX_IMAGES = 5;

type Named = { userId: string; name: string };

type CaptureResult = {
  recognised: (Named & { confidence: number })[];
  uncertain: {
    crop: string;
    vector: number[];
    candidates: (Named & { confidence: number })[];
  }[];
  notDetected: Named[];
  notEnrolled: Named[];
  suggestedAbsent: string[];
  stats: {
    facesDetected: number;
    facesUnmatched?: number;
    rosterSize: number;
    enrolledCount: number;
  };
};

const FaceAttendanceSheet = ({
  open,
  onOpenChange,
  batchId,
  date,
  onApply,
}: Props) => {
  const [files, setFiles] = useState<{ id: string; file: File; url: string }[]>([]);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<CaptureResult>();
  // Which student the teacher picked for each uncertain face. "none" means
  // they rejected both suggestions, so that face stays unresolved.
  const [picks, setPicks] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setResult(undefined);
      setPicks({});
    }
  }, [open]);

  useEffect(
    () => () => files.forEach((item) => URL.revokeObjectURL(item.url)),
    [files]
  );

  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    setFiles((prev) =>
      [
        ...prev,
        ...picked.map((file, index) => ({
          id: `${Date.now()}-${prev.length + index}`,
          file,
          url: URL.createObjectURL(file),
        })),
      ].slice(0, MAX_IMAGES)
    );
    event.target.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const found = prev.find((item) => item.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((item) => item.id !== id);
    });
  };

  const onRun = async () => {
    if (!batchId || !date || !files.length) return;
    try {
      setRunning(true);
      const form = new FormData();
      form.append("batchId", batchId);
      form.append("date", date);
      files.forEach((item, index) =>
        form.append("images", item.file, `class-${index}.jpg`)
      );

      const res = await api.post(ENDPOINT.attendanceCapture, form);
      setResult(res?.data?.data as CaptureResult);
      setPicks({});
    } catch (err) {
      toast({
        title: (err as any)?.message || "Could not read the photos",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const onApplyResult = async () => {
    if (!result) return;
    setApplying(true);

    // Each resolved face becomes a new signature, so the next class is matched
    // against real classroom conditions rather than only desk enrollment.
    const corrections = result.uncertain
      .map((face, index) => ({ face, userId: picks[index] }))
      .filter((item) => item.userId && item.userId !== "none");

    const saved = await Promise.allSettled(
      corrections.map((item) =>
        api.post(ENDPOINT.faceCorrection, {
          userId: item.userId,
          vector: item.face.vector,
        })
      )
    );
    const failed = saved.filter((entry) => entry.status === "rejected").length;
    if (failed) {
      toast({
        title: `${failed} correction${failed === 1 ? "" : "s"} could not be saved`,
        variant: "destructive",
      });
    }

    // Resolved students move out of the absent list. Anything still unresolved
    // stays absent, which is the error a teacher can see and fix.
    const resolved = new Set(corrections.map((item) => item.userId as string));

    // The audit keeps the machine's original suggestion, not the corrected one,
    // so the comparison afterwards measures what recognition actually got right.
    onApply(
      result.suggestedAbsent.filter((userId) => !resolved.has(userId)),
      {
        suggestedAbsent: result.suggestedAbsent,
        scores: result.recognised.map((match) => ({
          user: match.userId,
          confidence: match.confidence,
        })),
        facesDetected: result.stats.facesDetected,
        at: new Date().toISOString(),
      }
    );

    setApplying(false);
    onOpenChange(false);
  };

  const unresolved = result
    ? result.uncertain.filter((_, index) => !picks[index]).length
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <div className="flex flex-col gap-4 pt-2">
          <div>
            <h2 className="text-lg font-semibold">Mark with photos</h2>
            <p className="text-sm text-muted-foreground">
              Take 3 photos covering sections of the room — left, middle, right.
              One wide shot leaves faces too small to identify.
            </p>
          </div>

          {!result && (
            <>
              <label className="rounded-md border border-dashed px-3 py-6 text-center text-sm">
                <CameraIcon className="mx-auto mb-2 h-6 w-6 text-slate-400" />
                Take photos or pick from gallery ({files.length}/{MAX_IMAGES})
                {/* No `capture` attribute on purpose: it forces the camera and
                    hides the gallery. Without it, phones offer both. */}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onPick}
                  className="mt-2 block w-full text-xs"
                />
              </label>

              {!!files.length && (
                <div className="grid grid-cols-3 gap-2">
                  {files.map((item) => (
                    <div key={item.id} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt="class photo"
                        className="aspect-video w-full rounded object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        className="absolute -right-1 -top-1 rounded-full bg-red-600 p-0.5 text-white"
                        aria-label="Remove"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={onRun} disabled={!files.length || running}>
                {running && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                {running ? "Reading faces…" : "Recognise"}
              </Button>
            </>
          )}

          {result && (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-green-100 px-3 py-2 font-semibold text-green-800">
                  {result.recognised.length} recognised
                </div>
                <div className="rounded bg-slate-100 px-3 py-2 font-semibold text-slate-700">
                  {result.stats.facesDetected} faces seen
                </div>
              </div>

              {!!result.uncertain.length && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold">
                    Needs your check ({result.uncertain.length})
                  </p>
                  {result.uncertain.map((face, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-md border px-2 py-2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/jpeg;base64,${face.crop}`}
                        alt="unidentified face"
                        className="h-14 w-14 rounded object-cover"
                      />
                      <div className="flex flex-1 flex-wrap gap-1">
                        {face.candidates.map((candidate) => (
                          <Button
                            key={candidate.userId}
                            size="sm"
                            variant={
                              picks[index] === candidate.userId ? "default" : "outline"
                            }
                            className="h-7 rounded-full text-xs"
                            onClick={() =>
                              setPicks((prev) => ({
                                ...prev,
                                [index]: candidate.userId,
                              }))
                            }
                          >
                            {candidate.name}
                          </Button>
                        ))}
                        <Button
                          size="sm"
                          variant={picks[index] === "none" ? "destructive" : "outline"}
                          className="h-7 rounded-full text-xs"
                          onClick={() =>
                            setPicks((prev) => ({ ...prev, [index]: "none" }))
                          }
                        >
                          Neither
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!!result.notEnrolled.length && (
                <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span className="font-semibold">
                    {result.notEnrolled.length} not enrolled
                  </span>{" "}
                  — never candidates, so mark them by hand:{" "}
                  {result.notEnrolled.map((student) => student.name).join(", ")}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                {result.suggestedAbsent.length} of {result.stats.rosterSize} will
                be marked absent. Anyone the photos missed stays absent — check
                the list before submitting.
              </p>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={onApplyResult}
                  disabled={applying}
                >
                  {applying && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                  Apply{unresolved ? ` (${unresolved} unchecked)` : ""}
                </Button>
                <Button variant="outline" onClick={() => setResult(undefined)}>
                  Retake
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FaceAttendanceSheet;
