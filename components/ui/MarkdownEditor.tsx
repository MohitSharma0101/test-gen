"use client";

import React, { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Textarea } from "./textarea";
import Markdown from "./markdown";
import { Button } from "./button";

type Props = {
  defaultText?: string;
  onSave?: (changedText: string) => void;
};

const MarkdownEditor = ({ defaultText, onSave }: Props) => {
  const [text, setText] = useState(defaultText || "");
  return (
    <ResizablePanelGroup direction="horizontal" className="border">
      <ResizablePanel className="">
        <h5 className="w-full p-4 border-b font-bold gap-2 flex items-center h-[60px]">
          Editor
          <Button onClick={() => onSave?.(text)} className="ml-auto" size={'sm'}>
            Save
          </Button>
        </h5>
        <Textarea
          className="resize-none rounded-none text-base h-full max-h-[618px]"
          placeholder="Enter your text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel className="[&_ol]:list-decimal [&_ol]:list-outside [&_ol]:ml-4">
        <h5 className="w-full p-4 border-b font-bold flex items-center h-[60px]">Preview</h5>
        <div className="h-[618px] overflow-y-scroll">
          <Markdown text={text} />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default MarkdownEditor;
