import React, { ReactNode, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import MarkdownEditor from "../ui/MarkdownEditor";
import { Button } from "../ui/button";
import { EditIcon } from "lucide-react";

type Props = {
  text?: string;
  onSave?: (text: string) => void;
  children?: ReactNode;
};

const EditMarkdownSheet = ({ text, onSave, children }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant={"outline"} className="p-2 w-fit h-fit">
            <EditIcon className="w-3 h-3" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side={"bottom"} className="max-h-[80dvh]">
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
