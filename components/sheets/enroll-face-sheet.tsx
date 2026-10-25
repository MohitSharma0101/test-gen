"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Sheet, SheetContent } from "../ui/sheet";
import { Button } from "../ui/button";
import { toast } from "../ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import { TUser } from "@/models/User";
import {
  CameraIcon,
  CheckCircle2Icon,
  Loader2Icon,
  RefreshCwIcon,
  SwitchCameraIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  user?: TUser;
  onSuccess?: () => void;
};

// Varied angles matter far more than image quality. A single straight-on
// photo gives roughly 60-75% accuracy; this spread gets it to 90%+.
const PROMPTS = [
  "Look straight at the camera",
  "Turn your head slightly left",
  "Turn your head slightly right",
  "Tilt your chin down a little",
  "If you wear glasses, take them off",
];

type Shot = { id: string; blob: Blob; url: string; prompt: string };

type EnrollStatus = {
  signatureCount: number;
  enrollmentCount: number;
  correctionCount: number;
  faceEnrolledAt: string | null;
  recommended: number;
};

type EnrollResult = {
  accepted: number;
  rejected: { index: number; reason: string }[];
  signatureCount: number;
  weak: boolean;
  recommended: number;
};

const EnrollFaceSheet = ({ open, onOpenChange, user, onSuccess }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [shots, setShots] = useState<Shot[]>([]);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<EnrollStatus>();
  const [result, setResult] = useState<EnrollResult>();

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(undefined);

    // getUserMedia is only available over HTTPS or on localhost, and the
    // failure is otherwise a confusing undefined property error.
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera needs HTTPS. Use localhost in development, or upload photos instead."
      );
      return;
    }

    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        setCameraError("Camera permission was denied. Allow it, or upload photos instead.");
      } else if (err?.name === "NotFoundError") {
        setCameraError("No camera found on this device. Upload photos instead.");
      } else {
        setCameraError(err?.message || "Could not start the camera");
      }
    }
  }, [facingMode, stopCamera]);

  const loadStatus = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await api.get(`${ENDPOINT.faceEnroll}?userId=${user._id}`);
      setStatus(res?.data?.data);
    } catch {
      // Status is informational; a failure here should not block enrolling.
    }
  }, [user?._id]);

  useEffect(() => {
    if (open) {
      setShots([]);
      setResult(undefined);
      loadStatus();
      startCamera();
    } else {
      stopCamera();
    }
    return stopCamera;
  }, [open, loadStatus, startCamera, stopCamera]);

  // Release the preview URLs when the sheet unmounts so the blobs can be
  // collected. They are never uploaded anywhere but here.
  useEffect(
    () => () => shots.forEach((shot) => URL.revokeObjectURL(shot.url)),
    [shots]
  );

  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setShots((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${prev.length}`,
            blob,
            url: URL.createObjectURL(blob),
            prompt: PROMPTS[prev.length] ?? "Extra shot",
          },
        ]);
      },
      "image/jpeg",
      0.92
    );
  };

  const onPickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setShots((prev) => [
      ...prev,
      ...files.map((file, index) => ({
        id: `${Date.now()}-${prev.length + index}`,
        blob: file,
        url: URL.createObjectURL(file),
        prompt: PROMPTS[prev.length + index] ?? file.name,
      })),
    ]);
    event.target.value = "";
  };

  const removeShot = (id: string) => {
    setShots((prev) => {
      const shot = prev.find((item) => item.id === id);
      if (shot) URL.revokeObjectURL(shot.url);
      return prev.filter((item) => item.id !== id);
    });
  };

  const onSave = async () => {
    if (!user?._id || !shots.length) return;
    try {
      setSaving(true);
      const form = new FormData();
      form.append("userId", user._id);
      form.append("mode", "replace");
      shots.forEach((shot, index) =>
        form.append("images", shot.blob, `shot-${index}.jpg`)
      );

      const res = await api.post(ENDPOINT.faceEnroll, form);
      const data = res?.data?.data as EnrollResult;
      setResult(data);
      setShots([]);
      await loadStatus();
      onSuccess?.();

      toast({
        title: `${data.accepted} photo${data.accepted === 1 ? "" : "s"} enrolled`,
        variant: data.weak ? "default" : "success",
      });

      // Close on a clean save. When photos were rejected we stay open, because
      // the rejection list and the "too few signatures" warning are the only
      // places the admin learns the enrollment is thin.
      if (data.accepted > 0 && !data.rejected.length) {
        setTimeout(() => onOpenChange(false), 800);
      }
    } catch (err) {
      toast({
        title: (err as any)?.message || "Could not enroll this face",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onClear = async () => {
    if (!user?._id) return;
    try {
      await api.delete(`${ENDPOINT.faceEnroll}?userId=${user._id}`);
      setResult(undefined);
      await loadStatus();
      onSuccess?.();
      toast({ title: "Face data removed", variant: "success" });
    } catch (err) {
      toast({
        title: (err as any)?.message || "Could not remove face data",
        variant: "destructive",
      });
    }
  };

  const nextPrompt = PROMPTS[shots.length] ?? "Extra shot (optional)";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <div className="flex flex-col gap-4 pt-2">
          <div>
            <h2 className="text-lg font-semibold">Enroll face</h2>
            <p className="text-sm text-muted-foreground">{user?.name}</p>
          </div>

          {status && (
            <div className="text-xs rounded-md bg-slate-100 px-3 py-2">
              {status.signatureCount > 0 ? (
                <>
                  <span className="font-semibold">
                    {status.signatureCount} signature
                    {status.signatureCount === 1 ? "" : "s"} on file
                  </span>
                  {status.correctionCount > 0 && (
                    <> ({status.correctionCount} from teacher corrections)</>
                  )}
                  . Saving new photos replaces the enrolled set.
                </>
              ) : (
                <>Not enrolled yet. Capture {status.recommended} photos below.</>
              )}
            </div>
          )}

          <div className="relative overflow-hidden rounded-lg bg-black aspect-[3/4]">
            {cameraError ? (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">
                {cameraError}
              </div>
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{
                  // Mirror the preview so it feels like a mirror. The capture
                  // below draws the raw frame, not this transform.
                  transform: facingMode === "user" ? "scaleX(-1)" : undefined,
                }}
              />
            )}

            {!cameraError && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-2 text-center text-sm font-medium text-white">
                {nextPrompt}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="flex-1"
              onClick={capture}
              disabled={!!cameraError || saving}
            >
              <CameraIcon className="mr-2 h-4 w-4" />
              Capture ({shots.length})
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="Switch camera"
              onClick={() =>
                setFacingMode((mode) => (mode === "user" ? "environment" : "user"))
              }
            >
              <SwitchCameraIcon className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" title="Restart camera" onClick={startCamera}>
              <RefreshCwIcon className="h-4 w-4" />
            </Button>
          </div>

          <label className="text-xs text-muted-foreground">
            Or upload photos
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onPickFiles}
              className="mt-1 block w-full text-xs"
            />
          </label>

          {!!shots.length && (
            <div className="grid grid-cols-4 gap-2">
              {shots.map((shot) => (
                <div key={shot.id} className="relative">
                  {/* Local blob preview, never uploaded for display. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shot.url}
                    alt={shot.prompt}
                    className="aspect-square w-full rounded object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeShot(shot.id)}
                    className="absolute -right-1 -top-1 rounded-full bg-red-600 p-0.5 text-white"
                    aria-label="Remove photo"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {result && (
            <div className="space-y-2 rounded-md border px-3 py-2 text-xs">
              <div className="flex items-center gap-1 font-semibold">
                <CheckCircle2Icon className="h-4 w-4 text-green-600" />
                {result.accepted} accepted, {result.signatureCount} total
              </div>
              {result.weak && (
                <p className="text-amber-600">
                  Fewer than {result.recommended} signatures. Accuracy will be
                  noticeably worse — add more angles when you can.
                </p>
              )}
              {!!result.rejected.length && (
                <ul className="list-disc pl-4 text-muted-foreground">
                  {result.rejected.map((item) => (
                    <li key={item.index}>
                      Photo {item.index + 1}: {item.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button className="flex-1" onClick={onSave} disabled={!shots.length || saving}>
              {saving && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              Save {shots.length ? `${shots.length} photo${shots.length === 1 ? "" : "s"}` : ""}
            </Button>
            {!!status?.signatureCount && (
              <Button variant="outline" size="icon" title="Remove face data" onClick={onClear}>
                <Trash2Icon className="h-4 w-4" />
              </Button>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Photos are turned into signatures and discarded — nothing is stored.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EnrollFaceSheet;
