import { create } from "zustand";

type ConfirmState = {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  action?: () => Promise<void> | void;

  openConfirm: (config: {
    title?: string;
    description?: string;
    confirmText?: string;
    action: () => Promise<void> | void;
  }) => void;

  closeConfirm: () => void;
};

export const useConfirmationStore = create<ConfirmState>((set) => ({
  open: false,

  openConfirm: ({ title, description, confirmText, action }) =>
    set({
      open: true,
      title: title || "Are you absolutely sure?",
      description: description || "This action cannot be undone.",
      confirmText: confirmText || "Confirm",
      action,
    }),

  closeConfirm: () =>
    set({
      open: false,
      action: undefined,
    }),
}));
