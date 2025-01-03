import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import RandomInput from "@/components/ui/random-input";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { TChapter } from "@/models/Chapter";
import {
  ArrowUpDownIcon,
  CheckIcon,
  PenLineIcon,
  Trash2Icon,
} from "lucide-react";
import React, { useRef, useState } from "react";

type Props = {
  index: number;
  chapter: TChapter;
  selected?: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string, order?: number) => void;
  onSelectChange?: (selected: boolean) => void;
};

const ChapterItem = ({ index, selected, chapter, onDelete, onUpdate, onSelectChange }: Props) => {
  const [title, setTitle] = useState(chapter.title);
  const [editMode, setEditMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onEditClick = () => {
    if (editMode) {
      if (title) {
        setEditMode(false);
        if (title != chapter.title) {
          onUpdate(chapter._id, title);
        }
      } else {
        toast({
          title: "Chapter Title can't be empty!",
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
      <Checkbox
        checked={selected}
        onCheckedChange={onSelectChange}
        className="mr-2"
      />
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
      <RandomInput
        defaultValue={chapter.order}
        className="ml-auto mr-2"
        icon={<ArrowUpDownIcon className="w-4 h-4" />}
        onSubmit={(order) => {
          onUpdate(chapter._id, chapter.title, order);
        }}
      />
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
            <DialogDescription>
              This action cannot be undone. Deleting a chapter will also
              permanently delete every question linked with this chapter.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-4 mt-4">
            <DialogClose asChild>
              <Button variant={"outline"}>Cancel</Button>
            </DialogClose>
            <Button
              variant={"destructive"}
              onClick={() => onDelete(chapter._id)}
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

export default ChapterItem;
