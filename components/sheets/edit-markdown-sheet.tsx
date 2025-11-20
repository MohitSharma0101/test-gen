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
      <SheetContent side={"bottom"} className="max-h-[80dvh] pb-10 px-2 md:px-4">
        <MarkdownEditor
          defaultText={text}
          onSave={(text) => {
            onSave?.(text);
            setOpen(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
};

export default EditMarkdownSheet;
