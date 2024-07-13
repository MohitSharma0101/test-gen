import React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./button";
import { Trash2Icon } from "lucide-react";

type Props = {
  className?: string;
  onDelete?: () => void;
  title?: string;
  description?: string;
};

const DeleteButton = ({ title, description, className, onDelete }: Props) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={"destructive"} size={"icon"} className={className}>
          <Trash2Icon className="w-4 h-4 text-destructive-foreground" />
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
          <Button variant={"destructive"} onClick={onDelete}>
            <Trash2Icon className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteButton;
