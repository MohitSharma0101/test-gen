// Hand-off from Online Test analysis to Generate Paper: the weak chapters of a
// test, grouped by subject. Written to localStorage just before navigating and
// read (then removed) once by Generate Paper on open.
export const PRACTICE_PREFILL_KEY = "generate-paper:prefill";

export type TPracticePrefill = {
  course: string;
  // subject → chapter ids
  chapters: Record<string, string[]>;
  // Shown on the Generate page: "Weak chapters from <source>"
  source: string;
};

export const writePracticePrefill = (value: TPracticePrefill) => {
  try {
    localStorage.setItem(PRACTICE_PREFILL_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

// The value just taken, so a second call on the same open (React runs mount
// effects twice in development) gets it too rather than finding it gone
let lastTaken: { value: TPracticePrefill | null; at: number } | null = null;

export const takePracticePrefill = (): TPracticePrefill | null => {
  if (lastTaken && Date.now() - lastTaken.at < 3000) return lastTaken.value;
  lastTaken = { value: readAndRemove(), at: Date.now() };
  return lastTaken.value;
};

const readAndRemove = (): TPracticePrefill | null => {
  try {
    const raw = localStorage.getItem(PRACTICE_PREFILL_KEY);
    localStorage.removeItem(PRACTICE_PREFILL_KEY);
    const v = raw ? (JSON.parse(raw) as TPracticePrefill) : null;
    return v && typeof v.chapters === "object" && Object.values(v.chapters).some((ids) => ids?.length) ? v : null;
  } catch {
    return null;
  }
};
