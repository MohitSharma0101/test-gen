"use client";

// Answer sheets arrive as PDFs (scanner, phone scan apps) or photos. The runner
// reads page images, so each PDF page is drawn to a JPEG here, in the browser:
// nothing heavy goes through our API, and the pages are already the size the
// runner wants. pdf.js (~1 MB) is loaded only when a PDF is actually added.

// Long side of a page image. ~150 dpi for A4: enough to read handwriting,
// and the model scales anything larger down to about this anyway.
const PAGE_LONG_SIDE = 1700;
const JPEG_QUALITY = 0.72;

type PdfJs = typeof import("pdfjs-dist");
let pdfjs: Promise<PdfJs> | null = null;
const loadPdfJs = () =>
  (pdfjs ??= import("pdfjs-dist").then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).toString();
    return lib;
  }));

const toJpeg = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't draw the page"))), "image/jpeg", JPEG_QUALITY)
  );

/** Every page of a PDF as a JPEG blob, in order. */
export async function pdfToPageImages(file: File, maxPages = 20): Promise<Blob[]> {
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  if (doc.numPages > maxPages) {
    await doc.destroy();
    throw new Error(`${file.name} has ${doc.numPages} pages (max ${maxPages})`);
  }
  const pages: Blob[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: PAGE_LONG_SIDE / Math.max(base.width, base.height) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Couldn't draw the page");
      ctx.fillStyle = "#fff"; // JPEG has no transparency
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      pages.push(await toJpeg(canvas));
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return pages;
}

/** Name-matching key: lowercase letters and digits only ("Riya Sharma (IX-F).pdf" -> "riyasharmaixf"). */
export const nameKey = (s: string) => s.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]/g, "");
