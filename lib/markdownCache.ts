// Memoizes mathpix-markdown-it's markdown-to-HTML step.
//
// Converting one question costs roughly 6-7 ms, and a paper renders far more
// questions than it has: PaperFrame prints each question's text twice (once in
// the paper, once above its answer), and every reopen of the preview converts
// everything again from scratch. A 30-question paper is about 90 conversions.
//
// The cache wraps MathpixMarkdownModel.convertToHTML rather than reimplementing
// it, so the library still builds its own options. The only change to the HTML
// is the figure rewriting in imageOptim; everything else is byte for byte what
// it was, and recomputation for identical input is skipped.

import { optimizeImages } from "./imageOptim";

type Converter = (text: string, options?: unknown) => string;

type Model = {
  convertToHTML: Converter;
  __cachedConvert?: boolean;
};

// About 8 KB of HTML per entry, so this is a few MB at worst
const MAX_ENTRIES = 300;

const cache = new Map<string, string>();

// Options carry functions (validateLink) which do not serialise; they are the
// same on every call from this app, but if a caller ever passes something
// unserialisable the cache is skipped rather than keyed wrongly.
const keyFor = (text: string, options?: unknown) => {
  if (options === undefined) return text;
  try {
    const shape = JSON.stringify(options, (_k, v) =>
      typeof v === "function" ? "fn" : v
    );
    return `${shape}\u0000${text}`;
  } catch {
    return null;
  }
};

export const installMarkdownCache = (model: Model) => {
  if (model.__cachedConvert) return;
  const original = model.convertToHTML.bind(model);

  model.convertToHTML = (text: string, options?: unknown) => {
    const key = typeof text === "string" ? keyFor(text, options) : null;
    if (key === null) return original(text, options);

    const hit = cache.get(key);
    if (hit !== undefined) {
      // Keep it fresh: re-inserting moves it to the end of the eviction order
      cache.delete(key);
      cache.set(key, hit);
      return hit;
    }

    // Figures are rewritten here so the result is cached alongside everything
    // else, rather than re-processed on every render
    const raw = original(text, options);
    const html = typeof raw === "string" ? optimizeImages(raw) : raw;
    if (typeof html === "string") {
      if (cache.size >= MAX_ENTRIES) {
        // Oldest first - Map preserves insertion order
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(key, html);
    }
    return html;
  };

  model.__cachedConvert = true;
};

// Question text changed under us, so anything derived from it is stale
export const clearMarkdownCache = () => cache.clear();

export const markdownCacheSize = () => cache.size;
