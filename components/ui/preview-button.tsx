import React, { startTransition, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";
import { Button } from "./button";
import { Print, PrintContent, PrintTrigger } from "./print";
import PaperFrame from "./paper-frame";
import type { TQuestion } from "@/models/Question";
import { Columns2Icon } from "lucide-react";

type Props = {
  questions: TQuestion[];
  onPrint?: () => void;
  defaultTwoColumn?: boolean;
  className?: string;
};

const PreviewButton = ({
  questions,
  onPrint,
  defaultTwoColumn,
  className,
}: Props) => {
  const [twoColumn, setTwoColumn] = useState(defaultTwoColumn);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          disabled={questions.length === 0}
          variant={"outline"}
          className={className}
        >
          Preview
        </Button>
      </SheetTrigger>
      <SheetContent
        side={"bottom"}
        className="max-h-[80svh] m-auto rounded max-w-screen-lg scrollbar-hide overflow-scroll"
      >
        <Print>
          <div className="flex gap-2">
            <PrintTrigger
              className="px-6"
              onClick={() => {
                startTransition(() => {
                  onPrint?.();
                });
              }}
              disabled={questions.length === 0}
            >
              Print
            </PrintTrigger>
            <Button
              variant={twoColumn ? "default" : "outline"}
              onClick={() => {
                setTwoColumn(!twoColumn);
              }}
            >
              <Columns2Icon className="w-4 h-4" />
            </Button>
          </div>

          <PrintContent className="block">
            <PaperFrame questions={questions} twoColumn={twoColumn} />
          </PrintContent>
        </Print>
      </SheetContent>
    </Sheet>
  );
};

export default PreviewButton;
