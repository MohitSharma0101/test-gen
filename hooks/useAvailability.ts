"use client";

import {
  fetchAvailability,
  type TAvailability,
  type TGenerateSection,
} from "@/service/core.service";
import { useEffect, useRef, useState } from "react";

// How many questions each subject's filters leave, so "30 from Physics" can
// say whether 30 are there. Debounced, because it is asked as the teacher ticks
// chapters, and the answer for a selection that has already moved on is thrown
// away.
const useAvailability = (sections: TGenerateSection[]) => {
  const [availability, setAvailability] = useState<TAvailability | null>(null);
  const [loading, setLoading] = useState(false);

  const live = sections.filter((section) => section.chapterIds.length > 0);
  const key = JSON.stringify(
    live.map((section) => [
      section.subject ?? "",
      [...section.chapterIds].sort(),
      section.marks ?? null,
      section.tags ?? null,
      !!section.unusedOnly,
    ])
  );
  const latest = useRef(key);

  useEffect(() => {
    latest.current = key;

    if (live.length === 0) {
      setAvailability(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetchAvailability(live);
        // A slower earlier request must not overwrite a newer answer
        if (latest.current === key) setAvailability(res);
      } catch {
        if (latest.current === key) {
          setAvailability({ available: 0, sections: [], perChapter: [] });
        }
      } finally {
        if (latest.current === key) setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [key]);

  return { availability, loading };
};

export default useAvailability;
