"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useVariantBatchStore } from "@/stores/variantBatchStore";
import { useSaveTargetStore } from "@/stores/saveTargetStore";
import { TAG } from "@/data/const";
import type { TQuestion } from "@/models/Question";
import type { TChapter } from "@/models/Chapter";

// Send a question to the Variants page: it becomes a new text tab there
// (question + answer, ready for a prompt and Generate), and "save to" points
// at the question's own chapter and marks, so the variants land next to it.
// Both stores are persisted, so this survives the navigation.
export const sendToVariants = (q: TQuestion, router: AppRouterInstance, label?: string) => {
  if (!q?.text?.trim()) return false;
  useVariantBatchStore.getState().addTextTab({
    text: q.text,
    answer: q.ans,
    // Same rule as lib/test-utils isNumerical (not imported: it pulls in models)
    questionType: q.tags?.includes(TAG.NUMERICAL) ? "NUMERICAL" : "MCQ",
    label,
  });
  const ch = q.chapter && typeof q.chapter === "object" ? (q.chapter as Partial<TChapter> & { chapterId?: string }) : null;
  const chapterId = ch?._id || ch?.chapterId;
  if (chapterId) {
    useSaveTargetStore.getState().setTarget({
      course: ch?.course ?? "",
      subject: ch?.subject ?? "",
      book: (ch?.book as string) ?? "",
      chapter: chapterId,
      marks: String(q.mark ?? 1),
      tag: "",
    });
  }
  router.push("/variants");
  return true;
};
