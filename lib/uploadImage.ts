import { api, ENDPOINT } from "@/lib/api";

type UploadTarget = {
  uploadUrl: string;
  fields: Record<string, string>;
  fileField: string;
  publicUrl?: string;
  responseUrlKey?: string;
  maxBytes: number;
};

// What storage accepts
const MAX_BYTES = 5 * 1024 * 1024;
// What a question figure is actually worth sending. A phone photo is 2-4 MB and
// used to be uploaded untouched, because only files over the 5 MB limit were
// re-encoded; at 0.4 Mbps that is a minute of upload for one figure.
const TARGET_BYTES = 600 * 1024;
const MAX_DIMENSION = 1600;

const loadImage = (file: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the image"));
    };
    img.src = url;
  });

// Shrinks anything bigger than a figure needs to be. Already-small images and
// GIFs (which would lose their animation) are uploaded untouched.
const shrinkIfNeeded = async (file: File): Promise<Blob> => {
  if (file.size <= TARGET_BYTES || file.type === "image/gif") return file;

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#fff"; // JPEG has no transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let smallest: Blob | null = null;
  for (const quality of [0.85, 0.75, 0.65, 0.5]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) continue;
    smallest = blob;
    if (blob.size <= TARGET_BYTES) return blob;
  }
  // Never got under the target, but anything under the hard limit still uploads
  if (smallest && smallest.size <= MAX_BYTES) return smallest;
  throw new Error("Image is too large even after shrinking (max 5 MB)");
};

// Uploads an image straight to the configured storage and returns its public URL.
export const uploadImage = async (file: File): Promise<string> => {
  const blob = await shrinkIfNeeded(file);
  const contentType = blob.type || file.type;

  const { data: target } = await api.post<UploadTarget>(ENDPOINT.uploadSign, {
    contentType,
    size: blob.size,
  });

  const form = new FormData();
  Object.entries(target.fields).forEach(([key, value]) => form.append(key, value));
  form.append(target.fileField, blob, file.name || "image");

  const res = await fetch(target.uploadUrl, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }

  if (target.publicUrl) return target.publicUrl;

  const json = await res.json();
  const url = target.responseUrlKey ? json?.[target.responseUrlKey] : undefined;
  if (!url) throw new Error("Upload finished but no image link came back");
  return url as string;
};
