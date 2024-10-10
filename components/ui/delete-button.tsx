"use client";

import React, { ReactNode, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, ButtonProps } from "./button";
import { Trash2Icon } from "lucide-react";

type Props = {
  className?: string;
  onDelete?: (closeModel: () => void) => void;
  title?: string;
  description?: string;
  size?: ButtonProps["size"];
  children?: ReactNode;
};

const DeleteButton = ({
  title,
  description,
  className,
  children,
  onDelete,
  size = "icon",
}: Props) => {
  const [open, setOpen] = useState(false);
  const closeDialog = () => setOpen(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={"destructive"} size={size} className={className}>
          <Trash2Icon className="w-4 h-4 text-destructive-foreground" />
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title || "Are you absolutely sure?"}</DialogTitle>
          <DialogDescription>
            {description || "This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-4 mt-4">
          <DialogClose asChild>
            <Button variant={"outline"}>Cancel</Button>
          </DialogClose>
          <Button
            variant={"destructive"}
            onClick={() => onDelete?.(closeDialog)}
          >
            <Trash2Icon className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteButton;
