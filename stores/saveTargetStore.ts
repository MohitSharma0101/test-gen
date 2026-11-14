import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Where generated variants get saved. Remembered for the browser session so
// the Save drawer opens already filled in: picking class → chapter → marks
// once covers every upload after it.
export type TSaveTarget = {
  course: string;
  subject: string;
  book: string;
  chapter: string;
  marks: string;
  tag: string;
};

type TSaveTargetStore = TSaveTarget & {
  setTarget: (change: Partial<TSaveTarget>) => void;
};

export const useSaveTargetStore = create<TSaveTargetStore>()(
  persist(
    (set) => ({
      course: "",
      subject: "",
      book: "",
      chapter: "",
      marks: "1",
      tag: "",
      setTarget: (change) => set(change),
    }),
    {
      name: "variant-save-target",
      // Session only: a new day starts from a clean choice
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
