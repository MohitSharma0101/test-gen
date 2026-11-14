"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ResponsiveDrawer } from "../ui/responsive-drawer";
import { cn } from "@/lib/utils";
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
  UploadIcon,
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

  const recommended = status?.recommended ?? PROMPTS.length;
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Enroll face"
      description={user?.name}
      footer={
        <div className="flex items-center gap-2">
          <Button variant="brand" className="h-11 flex-1 gap-2" onClick={onSave} disabled={!shots.length || saving}>
            {saving && <Loader2Icon className="size-4 animate-spin" />}
            {shots.length ? `Save ${shots.length} photo${shots.length === 1 ? "" : "s"}` : "Save"}
          </Button>
          {!!status?.signatureCount && (
            <Button
              variant="outline"
              className="size-11 shrink-0 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
              aria-label="Remove face data"
              title="Remove face data"
              onClick={onClear}
            >
              <Trash2Icon className="size-4" />
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        {status && (
          <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-sm">
            {/* One dot per recommended angle: filled for photos taken now */}
            <div className="flex shrink-0 gap-1" aria-hidden="true">
              {Array.from({ length: recommended }).map((_, i) => (
                <span key={i} className={cn("size-2 rounded-full", i < shots.length ? "bg-brand" : "bg-muted-foreground/25")} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {status.signatureCount > 0 ? (
                <>
                  <span className="font-semibold text-foreground">
                    {status.signatureCount} signature{status.signatureCount === 1 ? "" : "s"} on file
                  </span>
                  {status.correctionCount > 0 && <> ({status.correctionCount} from corrections)</>}. Saving new photos
                  replaces them.
                </>
              ) : (
                <>Not enrolled yet. Take {recommended} photos from different angles.</>
              )}
            </p>
          </div>
        )}

        {/* data-vaul-no-drag: dragging on the camera shouldn't pull the drawer closed */}
        <div data-vaul-no-drag className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl bg-black">
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">{cameraError}</div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{
                  // Mirror the preview so it feels like a mirror. The capture
                  // draws the raw frame, not this transform.
                  transform: facingMode === "user" ? "scaleX(-1)" : undefined,
                }}
              />
              {/* Where to put the face */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-[42%] h-[58%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-white/70"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 text-center text-sm font-medium text-white">
                {nextPrompt}
              </div>
              <div className="absolute right-2 top-2 flex gap-1.5">
                <button
                  type="button"
                  aria-label="Switch camera"
                  title="Switch camera"
                  onClick={() => setFacingMode((mode) => (mode === "user" ? "environment" : "user"))}
                  className="flex size-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70"
                >
                  <SwitchCameraIcon className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="Restart camera"
                  title="Restart camera"
                  onClick={startCamera}
                  className="flex size-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70"
                >
                  <RefreshCwIcon className="size-5" />
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mx-auto flex w-full max-w-sm items-center gap-2">
          <Button variant="brand" className="h-12 flex-1 gap-2 text-base" onClick={capture} disabled={!!cameraError || saving}>
            <CameraIcon className="size-5" />
            Take photo
          </Button>
          <input ref={fileInput} type="file" accept="image/*" multiple onChange={onPickFiles} className="hidden" />
          <Button variant="outline" className="h-12 gap-2" onClick={() => fileInput.current?.click()}>
            <UploadIcon className="size-4" /> Upload
          </Button>
        </div>

        {!!shots.length && (
          <div className="mx-auto grid w-full max-w-sm grid-cols-4 gap-2">
            {shots.map((shot) => (
              <div key={shot.id} className="relative">
                {/* Local blob preview, never uploaded for display. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shot.url} alt={shot.prompt} className="aspect-square w-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => removeShot(shot.id)}
                  className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-red-600 text-white shadow"
                  aria-label="Remove photo"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {result && (
          <div className="space-y-2 rounded-xl border bg-card px-3 py-2.5 text-xs">
            <div className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2Icon className="size-4 text-emerald-600" />
              {result.accepted} accepted, {result.signatureCount} total
            </div>
            {result.weak && (
              <p className="text-amber-700">
                Fewer than {result.recommended} signatures. Accuracy will be noticeably worse. Add more angles when you can.
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

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          Photos are turned into signatures and discarded. Nothing is stored.
        </p>
      </div>
    </ResponsiveDrawer>
  );
};

export default EnrollFaceSheet;
