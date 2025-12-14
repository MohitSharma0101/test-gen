"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConfirmationStore } from "@/stores/confirmation.store";

const ConfirmationModal = () => {
  const { open, title, description, confirmText, action, closeConfirm } = useConfirmationStore();

  const handleConfirm = async () => {
    await action?.();
    closeConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={closeConfirm}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title || "Are you absolutely sure?"}</DialogTitle>
          <DialogDescription>{description || "This action cannot be undone."}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-4 mt-4">
          <Button variant="outline" onClick={closeConfirm}>
            Cancel
          </Button>

          <Button variant="destructive" onClick={handleConfirm}>
            {confirmText || "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;
