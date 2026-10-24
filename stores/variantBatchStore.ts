"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api, ENDPOINT } from "@/lib/api";
import { imageToBase64Jpeg } from "@/lib/image";
import type {
  TGeneratedQuestion,
  TGenerateVariantsResponse,
  TQuestionType,
  TThinkingMode,
} from "@/lib/ai/types";
import { DEFAULT_THINKING_MODE } from "@/lib/ai/types";
import { DEFAULT_FREE_MODEL } from "@/lib/ai/free-models";
import { DEFAULT_VARIANT_COUNT } from "@/lib/ai/generateVariants";

// One tab is one source photo and the questions generated from it.
//
// The work lives here rather than in the tab's component on purpose: only the
// open tab is mounted, so a generation owned by a component would be thrown
// away the moment the teacher switched tabs to review something else - which is
// the entire point of having tabs.
export type TTabStatus = "queued" | "generating" | "ready" | "failed" | "uploaded";

export type TVariantTab = {
  id: string;
  label: string;
  status: TTabStatus;
  error?: string;
  questionType: TQuestionType;
  questions: TGeneratedQuestion[];
  // Which questions are ticked for upload, by question id
  selected: Record<string, boolean>;
  // The photo is gone after a reload, so a tab restored from storage cannot be
  // generated or retried until one is added again
  hasImage: boolean;
};

type TState = {
  tabs: TVariantTab[];
  activeId: string | null;
  // Settings shared by every tab in the batch
  model: string;
  thinking: TThinkingMode;
  prompt: string;
  // How many variants each photo should produce
  variantCount: number;
};

type TActions = {
  addPhotos: (files: File[]) => void;
  setActive: (id: string) => void;
  removeTab: (id: string) => void;
  retry: (id: string) => void;
  replacePhoto: (id: string, file: File) => void;
  imageFor: (id: string) => File | undefined;

  setQuestions: (id: string, questions: TGeneratedQuestion[]) => void;
  updateQuestion: (id: string, questionId: string, change: Partial<TGeneratedQuestion>) => void;
  setSelected: (id: string, questionId: string, checked: boolean) => void;
  markUploaded: (id: string) => void;

  setModel: (model: string) => void;
  setThinking: (thinking: TThinkingMode) => void;
  setPrompt: (prompt: string) => void;
  setVariantCount: (count: number) => void;
  clearAll: () => void;
};

// Photos never reach storage: a page's worth of them is megabytes of base64
// against a quota of about five, and a File does not survive JSON anyway. They
// are kept here, outside the store, so nothing tries to serialise them.
const images = new Map<string, File>();

// The free tier answers "high demand" often enough that five requests at once
// mostly produce failures. Two keeps the queue moving without provoking it.
const MAX_IN_FLIGHT = 2;
let inFlight = 0;

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useVariantBatchStore = create<TState & TActions>()(
  persist(
    (set, get) => {
      const patch = (id: string, change: Partial<TVariantTab>) =>
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...change } : t)),
        }));

      // Starts whatever is queued, up to the concurrency limit
      const pump = () => {
        if (inFlight >= MAX_IN_FLIGHT) return;
        const next = get().tabs.find((t) => t.status === "queued" && images.has(t.id));
        if (!next) return;

        inFlight++;
        patch(next.id, { status: "generating", error: undefined });

        (async () => {
          try {
            const file = images.get(next.id);
            if (!file) throw new Error("The photo for this tab is no longer available");
            const image = await imageToBase64Jpeg(file);
            const { prompt, thinking, model, variantCount } = get();
            const { data } = await api.post<TGenerateVariantsResponse>(
              ENDPOINT.generateVariants,
              {
                image,
                prompt: prompt.trim() || undefined,
                thinking,
                model: model || undefined,
                variantCount,
              }
            );
            patch(next.id, {
              status: "ready",
              questionType: data.questionType,
              questions: data.questions,
              // Variants start ticked; the original starts unticked
              selected: Object.fromEntries(
                data.questions.map((q) => [q.id, q.kind === "variant"])
              ),
            });
          } catch (err: any) {
            // No automatic retry: on this tier a retry storm burns the quota
            // that the next tab needs. The tab offers the teacher a retry.
            patch(next.id, {
              status: "failed",
              error: err?.message || "Could not generate variants",
            });
          } finally {
            inFlight--;
            pump();
          }
        })();

        pump();
      };

      return {
        tabs: [],
        activeId: null,
        model: DEFAULT_FREE_MODEL,
        thinking: DEFAULT_THINKING_MODE,
        prompt: "",
        variantCount: DEFAULT_VARIANT_COUNT,

        addPhotos: (files) => {
          if (!files.length) return;
          const added = files.map((file, i) => {
            const id = newId();
            images.set(id, file);
            return {
              id,
              label: `Q${get().tabs.length + i + 1}`,
              status: "queued" as TTabStatus,
              questionType: "MCQ" as TQuestionType,
              questions: [],
              selected: {},
              hasImage: true,
            };
          });
          set((s) => ({
            tabs: [...s.tabs, ...added],
            activeId: s.activeId ?? added[0].id,
          }));
          pump();
        },

        setActive: (id) => set({ activeId: id }),

        removeTab: (id) => {
          images.delete(id);
          set((s) => {
            const tabs = s.tabs.filter((t) => t.id !== id);
            const activeId =
              s.activeId === id ? tabs.find((t) => t.status === "ready")?.id ?? tabs[0]?.id ?? null : s.activeId;
            return { tabs, activeId };
          });
        },

        retry: (id) => {
          if (!images.has(id)) return;
          patch(id, { status: "queued", error: undefined });
          pump();
        },

        replacePhoto: (id, file) => {
          images.set(id, file);
          patch(id, { status: "queued", error: undefined, hasImage: true });
          pump();
        },

        imageFor: (id) => images.get(id),

        setQuestions: (id, questions) => patch(id, { questions }),

        updateQuestion: (id, questionId, change) =>
          set((s) => ({
            tabs: s.tabs.map((t) =>
              t.id === id
                ? {
                    ...t,
                    questions: t.questions.map((q) =>
                      q.id === questionId ? { ...q, ...change } : q
                    ),
                  }
                : t
            ),
          })),

        setSelected: (id, questionId, checked) =>
          set((s) => ({
            tabs: s.tabs.map((t) =>
              t.id === id ? { ...t, selected: { ...t.selected, [questionId]: checked } } : t
            ),
          })),

        // Uploaded work is saved on the server, so the tab goes and the next
        // one ready for review takes its place
        markUploaded: (id) => {
          images.delete(id);
          set((s) => {
            const tabs = s.tabs.filter((t) => t.id !== id);
            const activeId =
              tabs.find((t) => t.status === "ready")?.id ?? tabs[0]?.id ?? null;
            return { tabs, activeId };
          });
        },

        setModel: (model) => set({ model }),
        setThinking: (thinking) => set({ thinking }),
        setPrompt: (prompt) => set({ prompt }),
        setVariantCount: (variantCount) => set({ variantCount }),

        clearAll: () => {
          images.clear();
          set({ tabs: [], activeId: null, prompt: "" });
        },
      };
    },
    {
      name: "variant-batch",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only what is worth surviving a reload. Photos are excluded above, and
      // recheck state is deliberately not kept: it describes a reply, not work.
      partialize: (s) => ({
        tabs: s.tabs.map((t) => ({ ...t, hasImage: false })),
        activeId: s.activeId,
        model: s.model,
        thinking: s.thinking,
        prompt: s.prompt,
        variantCount: s.variantCount,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // A tab that was mid-generation when the page died has no photo any
        // more, so it cannot resume. Mark it so the tab can ask for one rather
        // than spinning for ever.
        state.tabs = state.tabs
          .filter((t) => t.status !== "uploaded")
          .map((t) =>
            t.status === "ready"
              ? { ...t, hasImage: false }
              : { ...t, status: "failed", hasImage: false, error: "Add the photo again to generate this one" }
          );
      },
    }
  )
);
