"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { ResponsiveDrawer } from "../ui/responsive-drawer";
import { cn } from "@/lib/utils";
import { toast } from "../ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import { CameraIcon, ImagesIcon, Loader2Icon, RotateCcwIcon, ScanFaceIcon, XIcon } from "lucide-react";
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

  // Preview URLs are freed when a photo is removed, the panel closes or it
  // unmounts. (Freeing them on every change broke the earlier thumbnails as
  // soon as a second photo was added.)
  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(() => () => filesRef.current.forEach((item) => URL.revokeObjectURL(item.url)), []);

  useEffect(() => {
    if (!open) {
      filesRef.current.forEach((item) => URL.revokeObjectURL(item.url));
      setFiles([]);
      setResult(undefined);
      setPicks({});
    }
  }, [open]);
  // Two inputs: Android Chrome hides the camera when an input allows several
  // files, so the camera one takes a single shot and the gallery one many
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

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

  const label = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Mark with photos"
      description={result ? "Check the matches, then apply" : "3 photos: left, middle and right of the room"}
      footer={
        result ? (
          <div className="flex gap-2">
            <Button variant="outline" className="h-11 gap-2" onClick={() => setResult(undefined)} disabled={applying}>
              <RotateCcwIcon className="size-4" /> Retake
            </Button>
            <Button variant="brand" className="h-11 flex-1 gap-2" onClick={onApplyResult} disabled={applying}>
              {applying && <Loader2Icon className="size-4 animate-spin" />}
              Apply{unresolved ? ` · ${unresolved} unchecked` : ""}
            </Button>
          </div>
        ) : (
          <Button variant="brand" className="h-11 w-full gap-2" onClick={onRun} disabled={!files.length || running}>
            {running ? <Loader2Icon className="size-4 animate-spin" /> : <ScanFaceIcon className="size-4" />}
            {running ? "Reading faces…" : `Recognise${files.length ? ` · ${files.length} photo${files.length === 1 ? "" : "s"}` : ""}`}
          </Button>
        )
      }
    >
      <div className="space-y-4 p-4">
        {!result && (
          <>
            <p className="text-sm text-muted-foreground">
              One wide shot leaves faces too small to identify, so take a few closer ones covering each part of the room.
            </p>
            <input ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" />
            <input ref={galleryInput} type="file" accept="image/*" multiple onChange={onPick} className="hidden" />
            {files.length < MAX_IMAGES && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Camera", hint: "One photo at a time", Icon: CameraIcon, input: cameraInput },
                  { label: "Gallery", hint: "Pick several", Icon: ImagesIcon, input: galleryInput },
                ].map(({ label, hint, Icon, input }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => input.current?.click()}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed font-medium text-muted-foreground transition-colors hover:border-brand/50 hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                      files.length === 0 ? "py-8 text-sm" : "py-3 text-xs"
                    )}
                  >
                    <Icon className={files.length === 0 ? "size-7" : "size-5"} />
                    {label}
                    {files.length === 0 && <span className="text-xs font-normal">{hint}</span>}
                  </button>
                ))}
              </div>
            )}
            {files.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {files.map((item, index) => (
                  <div key={item.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={`Class photo ${index + 1}`} className="aspect-[4/3] w-full rounded-lg border object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      aria-label={`Remove photo ${index + 1}`}
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {files.length}/{MAX_IMAGES} photos
            </p>
          </>
        )}

        {result && (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Recognised", value: result.recognised.length, tone: "text-emerald-700" },
                { label: "Faces seen", value: result.stats.facesDetected, tone: "" },
                { label: "Will be absent", value: result.suggestedAbsent.length, tone: "text-red-700" },
              ].map((t) => (
                <div key={t.label} className="rounded-xl border bg-card px-2 py-2.5">
                  <p className={cn("text-xl font-bold tabular-nums", t.tone)}>{t.value}</p>
                  <p className="text-[11px] text-muted-foreground">{t.label}</p>
                </div>
              ))}
            </div>

            {!!result.uncertain.length && (
              <section className="space-y-2">
                <h3 className={label}>Who is this? · {result.uncertain.length}</h3>
                {result.uncertain.map((face, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-xl border bg-card p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`data:image/jpeg;base64,${face.crop}`} alt={`Unidentified face ${index + 1}`} className="size-16 shrink-0 rounded-lg object-cover" />
                    <div role="radiogroup" aria-label={`Face ${index + 1}`} className="flex flex-1 flex-wrap gap-1.5">
                      {face.candidates.map((candidate) => {
                        const on = picks[index] === candidate.userId;
                        return (
                          <button
                            key={candidate.userId}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => setPicks((prev) => ({ ...prev, [index]: candidate.userId }))}
                            className={cn(
                              "h-9 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                              on ? "border-brand bg-brand text-brand-foreground" : "bg-background hover:bg-muted"
                            )}
                          >
                            {candidate.name}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={picks[index] === "none"}
                        onClick={() => setPicks((prev) => ({ ...prev, [index]: "none" }))}
                        className={cn(
                          "h-9 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                          picks[index] === "none" ? "border-red-300 bg-red-50 text-red-700" : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        Neither
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {!!result.notEnrolled.length && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <span className="font-semibold">{result.notEnrolled.length} not enrolled</span>, so never matched. Mark them by hand:{" "}
                {result.notEnrolled.map((student) => student.name).join(", ")}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {result.suggestedAbsent.length} of {result.stats.rosterSize} will be marked absent. Anyone the photos missed stays absent, so check
              the list before submitting.
            </p>
          </>
        )}
      </div>
    </ResponsiveDrawer>
  );
};

export default FaceAttendanceSheet;
