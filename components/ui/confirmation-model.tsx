"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { useConfirmationStore } from "@/stores/confirmation.store";

const ConfirmationModal = () => {
  const { open, title, description, confirmText, action, closeConfirm } = useConfirmationStore();

  // Some actions take a while (deletes, bulk work): show it, and don't let a
  // second click start the action again.
  const [pending, setPending] = useState(false);
  const handleConfirm = async () => {
    setPending(true);
    try {
      await action?.();
    } finally {
      setPending(false);
      closeConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && closeConfirm()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title || "Are you absolutely sure?"}</DialogTitle>
          <DialogDescription>{description || "This action cannot be undone."}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-4 mt-4">
          <Button variant="outline" onClick={closeConfirm} disabled={pending}>
            Cancel
          </Button>

          <Button variant="destructive" onClick={handleConfirm} disabled={pending} className="gap-2">
            {pending && <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />}
            {confirmText || "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;
