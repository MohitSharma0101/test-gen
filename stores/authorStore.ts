import { AUTHORS } from "@/models/Author";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type TAuthorStore = {
  author?: (typeof AUTHORS)[number] | string;
  updateAuthor?: (author?: string) => void;
};

export const useAuthorStore = create<TAuthorStore>()(
  persist(
    (set) => ({
      author: undefined,
      updateAuthor: (author) => set({ author }),
    }),
    {
      name: "author-storage", // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
    }
  )
);
