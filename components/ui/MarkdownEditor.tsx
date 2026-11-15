"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Textarea } from "./textarea";
import Markdown from "./markdown";
import { Button } from "./button";
import { CheckIcon, ImagePlusIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { uploadImage } from "@/lib/uploadImage";
import { useIsNarrowViewport } from "@/hooks/useIsNarrowViewport";

type Props = {
  defaultText?: string;
  onSave?: (changedText: string) => void;
  // Told whenever the text starts or stops differing from defaultText
  onDirtyChange?: (dirty: boolean) => void;
};

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

// "[" and "]" would break the markdown image syntax
const toAltText = (name: string) =>
  name.replace(/\.[^.]+$/, "").replace(/[\[\]]/g, "") || "image";

// Dims images that are still uploading and puts an "Uploading…" label on them.
// Uploading images are the ones whose src is a local blob: URL.
const markUploadingImages = (root: HTMLElement) => {
  root.querySelectorAll<HTMLImageElement>('img[src^="blob:"]').forEach((img) => {
    if (img.parentElement?.dataset.uploading) return;
    const wrapper = document.createElement("span");
    wrapper.dataset.uploading = "true";
    wrapper.className = "relative inline-block";
    const overlay = document.createElement("span");
    overlay.className =
      "absolute inset-0 flex items-center justify-center gap-2 bg-white/70 text-sm font-medium text-slate-700";
    overlay.innerHTML =
      '<span class="h-4 w-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></span>Uploading…';
    img.replaceWith(wrapper);
    wrapper.append(img, overlay);
  });
};

const MarkdownEditor = ({ defaultText, onSave, onDirtyChange }: Props) => {
  const [text, setText] = useState(defaultText || "");
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  // Both panes always visible: side by side from sm up, stacked on a phone
  // (writing on top, preview below; the handle between them resizes)
  const narrow = useIsNarrowViewport();
  const dirty = text !== (defaultText || "");
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  // The preview re-renders its HTML on every change, so re-apply the overlay.
  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;
    markUploadingImages(root);
    const observer = new MutationObserver(() => markUploadingImages(root));
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const insertAtCursor = (snippet: string) => {
    const el = textareaRef.current;
    setText((prev) => {
      const start = el?.selectionStart ?? prev.length;
      const end = el?.selectionEnd ?? prev.length;
      const before = prev.slice(0, start);
      const after = prev.slice(end);
      // Keep each image on its own line
      const pre = before && !before.endsWith("\n") ? "\n" : "";
      const post = after.startsWith("\n") ? "" : "\n";
      const inserted = pre + snippet + post;
      requestAnimationFrame(() => {
        if (!el) return;
        const pos = start + inserted.length;
        el.setSelectionRange(pos, pos);
      });
      return before + inserted + after;
    });
  };

  const startUpload = async (file: File) => {
    const localUrl = URL.createObjectURL(file);
    const alt = toAltText(file.name);
    const placeholder = `![Uploading ${alt}…](${localUrl})`;
    insertAtCursor(placeholder);
    setUploadingCount((n) => n + 1);

    try {
      const url = await uploadImage(file);
      setText((prev) => prev.replace(placeholder, `![${alt}](${url})`));
    } catch (err: any) {
      setText((prev) => prev.replace(placeholder, ""));
      toast.error(`Couldn't upload ${file.name || "image"}: ${err?.message || "unknown error"}`);
    } finally {
      setUploadingCount((n) => n - 1);
      URL.revokeObjectURL(localUrl);
    }
  };

  const handleFiles = (files: FileList | File[] | null | undefined) => {
    const images = Array.from(files || []).filter((f) => IMAGE_TYPES.includes(f.type));
    images.forEach(startUpload);
    return images.length > 0;
  };

  const isUploading = uploadingCount > 0;

  const textarea = (
    <Textarea
      ref={textareaRef}
      aria-label="Text"
      // flex-1 + min-h-0 so it takes the height the window actually has
      className={cn(
        "min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-base leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-sm",
        isDragging && "ring-2 ring-inset ring-brand"
      )}
      placeholder="Type here. Paste or drop an image to upload it."
      value={text}
      onChange={(e) => setText(e.target.value)}
      onPaste={(e) => {
        if (handleFiles(e.clipboardData?.files)) e.preventDefault();
      }}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes("Files")) {
          e.preventDefault();
          setIsDragging(true);
        }
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }
      }}
    />
  );

  // A long equation renders as one unbreakable MathJax block, so the preview
  // scrolls sideways rather than widening the pane.
  const preview = (
    <div ref={previewRef} className="min-h-0 w-full max-w-full flex-1 overflow-auto break-words bg-white px-3 [&_ol]:ml-4 [&_ol]:list-outside [&_ol]:list-decimal">
      {text.trim() ? <Markdown text={text} /> : <p className="py-6 text-center text-sm text-muted-foreground">Nothing to preview yet</p>}
    </div>
  );

  const paneLabel = "flex h-9 shrink-0 items-center border-b bg-muted/40 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* One action bar: tabs (phone), image, save */}
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {narrow ? "Paste or drop images to upload" : "Paste or drop images into the text to upload them"}
        </p>
        <div className="ml-auto flex items-center gap-2">
          {isUploading && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2Icon className="size-3.5 animate-spin" /> Uploading {uploadingCount}
            </span>
          )}
          <Button variant="outline" className="h-9 gap-1.5 px-3" onClick={() => fileInputRef.current?.click()}>
            <ImagePlusIcon className="size-4" />
            <span className="hidden sm:inline">Image</span>
            <span className="sr-only sm:hidden">Add image</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button variant="brand" className="h-9 gap-1.5 px-4" onClick={() => onSave?.(text)} disabled={isUploading || !dirty}>
            <CheckIcon className="size-4" />
            {isUploading ? "Uploading…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Remounted when the direction changes so the panels re-measure
          instead of keeping sizes from the other axis */}
      <ResizablePanelGroup key={narrow ? "v" : "h"} direction={narrow ? "vertical" : "horizontal"} className="min-h-0 flex-1">
        {/* min-w-0 as well as min-h-0: a flex child defaults to min-width:auto,
            so without it wide content stretches the pane instead of scrolling */}
        <ResizablePanel defaultSize={50} minSize={20} className="flex min-h-0 min-w-0 flex-col">
          <div className={paneLabel}>Write</div>
          {textarea}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={20} className="flex min-h-0 min-w-0 flex-col">
          <div className={paneLabel}>Preview</div>
          {preview}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default MarkdownEditor;
