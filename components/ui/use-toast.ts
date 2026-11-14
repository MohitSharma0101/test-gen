"use client";

import type { ReactNode } from "react";
import { toast as sonner } from "sonner";

// One toast system: Sonner (components/ui/sonnar-toaster.tsx). This keeps the
// old Radix-style call, toast({ title, description, variant }), so existing
// code didn't need rewriting; it simply shows a Sonner toast now.
// New code can import { toast } from "sonner" directly.

type TToastInput = {
  title?: ReactNode;
  description?: ReactNode;
  variant?: "default" | "success" | "destructive" | "warning" | null;
  duration?: number;
};

function toast({ title, description, variant, duration }: TToastInput) {
  const message = title ?? description ?? "";
  const options = {
    description: title !== undefined && title !== null ? description : undefined,
    duration,
  };
  const id =
    variant === "success"
      ? sonner.success(message, options)
      : variant === "destructive"
        ? sonner.error(message, options)
        : variant === "warning"
          ? sonner.warning(message, options)
          : sonner(message, options);
  return {
    id,
    dismiss: () => sonner.dismiss(id),
  };
}

function useToast() {
  return { toast, dismiss: (id?: string | number) => sonner.dismiss(id) };
}

export { useToast, toast };
