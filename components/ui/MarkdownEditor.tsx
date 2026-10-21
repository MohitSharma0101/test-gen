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
import { ImagePlusIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/lib/uploadImage";
import { useIsNarrowViewport } from "@/hooks/useIsNarrowViewport";

type Props = {
  defaultText?: string;
  onSave?: (changedText: string) => void;
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

const MarkdownEditor = ({ defaultText, onSave }: Props) => {
  const [text, setText] = useState(defaultText || "");
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  // Two panes side by side need width a phone does not have
  const direction = useIsNarrowViewport() ? "vertical" : "horizontal";

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

  return (
    // Stacked on a phone, side by side from sm up. The group is remounted when
    // the direction changes so the panels re-measure instead of keeping sizes
    // from the other axis.
    <ResizablePanelGroup
      key={direction}
      direction={direction}
      className="h-full min-h-0 border"
    >
      {/* min-w-0 as well as min-h-0: a flex child defaults to min-width:auto, so
          without it wide content stretches the pane instead of scrolling */}
      <ResizablePanel className="flex min-h-0 min-w-0 flex-col">
        {/* pr-10 keeps the Save button clear of the sheet's close button */}
        <h5 className="flex h-[60px] w-full shrink-0 items-center gap-2 border-b p-4 pr-10 font-bold sm:pr-4">
          Editor
          <Button
            variant={"outline"}
            size={"sm"}
            className="ml-auto gap-1"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlusIcon className="w-4 h-4" />
            Image
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
          <Button
            onClick={() => onSave?.(text)}
            size={"sm"}
            disabled={isUploading}
          >
            {isUploading ? "Uploading…" : "Save"}
          </Button>
        </h5>
        <Textarea
          ref={textareaRef}
          // flex-1 + min-h-0 so it takes the height the sheet actually has.
          // A fixed height here overflowed the sheet on a phone.
          className={`min-h-0 flex-1 resize-none rounded-none text-base ${
            isDragging ? "ring-2 ring-primary ring-inset" : ""
          }`}
          placeholder="Enter your text here... Paste or drop an image to upload it."
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
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel className="flex min-h-0 min-w-0 flex-col [&_ol]:list-decimal [&_ol]:list-outside [&_ol]:ml-4">
        <h5 className="flex h-[60px] w-full shrink-0 items-center border-b p-4 font-bold">
          Preview
        </h5>
        {/* A long equation renders as one unbreakable MathJax block, so the
            preview scrolls sideways rather than widening the pane. Matches how
            the generate sheet renders the same markdown. */}
        <div
          ref={previewRef}
          className="min-h-0 w-full max-w-full flex-1 overflow-auto break-words"
        >
          <Markdown text={text} />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default MarkdownEditor;
