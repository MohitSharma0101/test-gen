import React, { ReactNode, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import MarkdownEditor from "../ui/MarkdownEditor";
import { Button } from "../ui/button";
import { EditIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  text?: string;
  onSave?: (text: string) => void;
  className?: string;
  children?: ReactNode;
};

const EditMarkdownSheet = ({ text, onSave, children, className }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button
            variant={"outline"}
            className={cn("p-2 w-fit h-fit", className)}
          >
            <EditIcon className="w-3 h-3" />
          </Button>
        )}
      </SheetTrigger>
      {/* Editing markdown is a focused job, so a phone gets the whole screen.
          The height is definite rather than a max so the editor inside can size
          its panes from it; with an auto height they collapsed and it used to
          fall back to a fixed 618px that overflowed the sheet. */}
      <SheetContent
        side={"bottom"}
        className="flex h-[100dvh] flex-col gap-0 px-2 pt-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:h-[85dvh] md:px-4"
      >
        <div className="min-h-0 flex-1">
          <MarkdownEditor
            defaultText={text}
            onSave={(text) => {
              onSave?.(text);
              setOpen(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditMarkdownSheet;
