import React, { ReactNode, useState } from "react";
import { Button } from "../ui/button";
import { PlusIcon, TagIcon, XIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTrigger,
} from "../ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import { putUpdateQuestion } from "@/service/core.service";
import { cn } from "@/lib/utils";
import { TAG } from "@/data/const";
import { toast } from "../ui/use-toast";

type Props = {
  questionId?: string;
  tags?: string[];
  children?: ReactNode;
  // Controlled (opened from a menu item): no trigger unless children are given
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: (tags: string[]) => void;
};

// One list for every tag picker (filters, quotas, add tag), from the shared enum
export const TAGS: string[] = Object.values(TAG);

const AddTagSheet = ({ questionId, children, tags = [], open: openProp, onOpenChange, onSaved }: Props) => {
  const [innerOpen, setInnerOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : innerOpen;
  const setOpen = (o: boolean) => (controlled ? onOpenChange?.(o) : setInnerOpen(o));
  const [selectedTags, setSelectedTags] = useState<string[]>(tags);

  const onAddTags = async () => {
    try {
      if (questionId) {
        await putUpdateQuestion({
          id: questionId,
          tags: selectedTags,
        });

        toast({
          title: "Tags Added!",
        });
        onSaved?.(selectedTags);
        setOpen(false);
      } else {
        throw new Error("Question Id missing");
      }
    } catch (e) {
      console.log("e");
      toast({
        title: "Something went wrong.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {(children || !controlled) && (
      <DialogTrigger asChild>
        {children || (
          <Button variant={"outline"} className="p-2 w-fit h-fit bg-white">
            <abbr title={selectedTags.join(", ")}>
              <TagIcon className="w-3 h-3" />
            </abbr>
          </Button>
        )}
      </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Tag</DialogTitle>
          <DialogDescription>
            You can add multiple tags to filter out questions.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 flex gap-2 flex-wrap">
          {TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <Button
                key={`${tag}_${isSelected}`}
                variant={"outline"}
                className={cn(
                  "rounded-full px-3 py-4 text-sm",
                  isSelected && "border border-gray-500 bg-gray-50"
                )}
                onClick={() =>
                  setSelectedTags((prev) =>
                    isSelected
                      ? prev.filter((item) => item != tag)
                      : [...prev, tag]
                  )
                }
              >
                {tag}
                {isSelected && <XIcon className="w-4 h-4 ml-2" />}
              </Button>
            );
          })}
        </div>
        <Button
          onClick={onAddTags}
          className="w-fit ml-auto rounded-md"
        >
          Update Tags
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default AddTagSheet;
