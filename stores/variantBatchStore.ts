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
import { DEFAULT_FREE_MODEL, isFreeModel } from "@/lib/ai/free-models";
import { DEFAULT_VARIANT_COUNT } from "@/lib/ai/generateVariants";

// One tab is one source photo and the questions generated from it.
//
// The work lives here rather than in the tab's component on purpose: only the
// open tab is mounted, so a generation owned by a component would be thrown
// away the moment the teacher switched tabs to review something else - which is
// the entire point of having tabs.
export type TTabStatus =
  | "draft" // has its form, waiting for a photo or for Generate to be pressed
  | "queued"
  | "generating"
  | "ready"
  | "failed"
  | "uploaded";

// The inputs a photo was generated with. They live per tab so a tab can be
// regenerated with different settings without touching its neighbours, and so
// coming back to a tab shows what produced it.
export type TTabSettings = {
  model: string;
  thinking: TThinkingMode;
  prompt: string;
  variantCount: number;
};

export type TVariantTab = TTabSettings & {
  id: string;
  label: string;
  status: TTabStatus;
  error?: string;
  // When the current generation began, so a progress bar can pick up where it
  // actually is rather than restarting whenever the tab is opened
  startedAt?: number;
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
  addTab: () => string;
  addPhotos: (files: File[]) => void;
  setPhoto: (id: string, file: File) => void;
  updateSettings: (id: string, change: Partial<TTabSettings>) => void;
  generate: (id: string) => void;
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
        patch(next.id, { status: "generating", error: undefined, startedAt: Date.now() });

        (async () => {
          try {
            const file = images.get(next.id);
            if (!file) throw new Error("The photo for this tab is no longer available");
            const image = await imageToBase64Jpeg(file);
            const { prompt, thinking, model, variantCount } = next;
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
              startedAt: undefined,
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
              startedAt: undefined,
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

        // A tab with its form, waiting for a photo. Nothing runs until the
        // teacher presses Generate.
        addTab: () => {
          const { model, thinking, prompt, variantCount } = get();
          const id = newId();
          set((s) => ({
            tabs: [
              ...s.tabs,
              {
                id,
                label: `Q${s.tabs.length + 1}`,
                status: "draft" as TTabStatus,
                questionType: "MCQ" as TQuestionType,
                questions: [],
                selected: {},
                hasImage: false,
                model,
                thinking,
                prompt,
                variantCount,
              },
            ],
            activeId: id,
          }));
          return id;
        },

        setPhoto: (id, file) => {
          images.set(id, file);
          patch(id, { hasImage: true, status: "draft", error: undefined });
        },

        // Several photos at once still get a tab each, but each one waits for
        // its own Generate
        addPhotos: (files) => {
          if (!files.length) return;
          // A new tab starts from the settings last used, then owns them
          const { model, thinking, prompt, variantCount } = get();
          const added = files.map((file, i) => {
            const id = newId();
            images.set(id, file);
            return {
              id,
              label: `Q${get().tabs.length + i + 1}`,
              status: "draft" as TTabStatus,
              questionType: "MCQ" as TQuestionType,
              questions: [],
              selected: {},
              hasImage: true,
              model,
              thinking,
              prompt,
              variantCount,
            };
          });
          set((s) => ({
            tabs: [...s.tabs, ...added],
            activeId: added[0].id,
          }));
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

        // Changing a tab's settings also updates what the next new tab starts
        // from, so the teacher does not have to set the same thing twice
        updateSettings: (id, change) => {
          patch(id, change);
          set((s) => ({ ...s, ...change }));
        },

        generate: (id) => {
          if (!images.has(id)) return;
          patch(id, { status: "queued", error: undefined, questions: [], selected: {} });
          pump();
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
        // A model that was offered when this was saved may not be any more,
        // and a tab stuck on one would be refused by the server
        const usable = (model: string) => (isFreeModel(model) ? model : DEFAULT_FREE_MODEL);
        state.model = usable(state.model);

        // Photos are not kept, so a tab that had not finished comes back as a
        // draft waiting for its photo rather than spinning or claiming to have
        // failed. Tabs with questions keep them.
        state.tabs = state.tabs
          .filter((t) => t.status !== "uploaded")
          .map((t) => ({
            ...t,
            model: usable(t.model),
            hasImage: false,
            startedAt: undefined,
            ...(t.status === "ready" ? {} : { status: "draft" as TTabStatus, error: undefined }),
          }));
      },
    }
  )
);
