import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import PaperFrame from "@/components/frames/paper-frame";
import { Print, PrintContent, PrintTrigger } from "@/components/ui/print";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { TPaper } from "@/models/Paper";
import { CheckIcon, PenLineIcon, Trash2Icon } from "lucide-react";
import React, { startTransition, useRef, useState } from "react";

type Props = {
  index: number;
  paper: TPaper;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, title: string) => void;
};

const PaperItem = ({ index, paper, onDelete, onUpdate }: Props) => {
  const [title, setTitle] = useState(paper.title);
  const [editMode, setEditMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onEditClick = () => {
    if (editMode) {
      if (title) {
        setEditMode(false);
        if (title != paper.title) {
          onUpdate?.(paper._id, title);
        }
      } else {
        toast({
          title: "Paper Title can't be empty!",
          variant: "destructive",
        });
      }
    } else {
      setEditMode(true);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="text-start p-4 justify-start items-center rounded-none border-b last:border-none border-slate-300 flex ">
      <span>{index + 1}.</span>
      <Input
        value={title}
        ref={inputRef}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEditClick();
        }}
        className={cn(
          "w-[250px] ml-2",
          !editMode && "bg-transparent pointer-events-none"
        )}
        autoFocus={editMode}
      />
      <Sheet>
        <SheetTrigger asChild>
          <Button
            disabled={paper.questions.length === 0}
            variant={"outline"}
            className="ml-auto mr-2"
          >
            Preview
          </Button>
        </SheetTrigger>
        <SheetContent
          side={"bottom"}
          className="max-h-[80svh] m-auto rounded max-w-screen-lg scrollbar-hide overflow-scroll"
        >
          <Print>
            <PrintTrigger
              className="px-6"
              onClick={() => {
                startTransition(() => {
                  // updateUsage(selectedQuestions);
                });
              }}
              disabled={paper.questions.length === 0}
            >
              Print
            </PrintTrigger>
            <PrintContent className="block">
              <PaperFrame
                questions={paper.questions}
                twoColumn={true}
                // course={course}
                // subject={subject}
              />
            </PrintContent>
          </Print>
        </SheetContent>
      </Sheet>
      <Button variant={"outline"} size={"icon"} onClick={onEditClick}>
        {editMode ? (
          <CheckIcon className="w-4 h-4" />
        ) : (
          <PenLineIcon className="w-4 h-4" />
        )}
      </Button>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant={"destructive"} size={"icon"} className="ml-2">
            <Trash2Icon className="w-4 h-4 text-destructive-foreground" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-4 mt-4">
            <DialogClose asChild>
              <Button variant={"outline"}>Cancel</Button>
            </DialogClose>
            <Button
              variant={"destructive"}
              onClick={() => onDelete?.(paper._id)}
            >
              <Trash2Icon className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaperItem;
