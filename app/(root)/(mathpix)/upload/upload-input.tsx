import EditMarkdownSheet from "@/components/sheets/edit-markdown-sheet";
import { Button } from "@/components/ui/button";
import { readFile } from "@/lib/utils";
import { Edit2Icon } from "lucide-react";
import React, { ReactNode } from "react";

type Props = {
  id: string;
  icon: ReactNode;
  label: string;
  text: string;
  onChange: (text: string) => void;
};

const UploadInput = ({ id, icon, text, label, onChange }: Props) => {
  return (
    <label
      htmlFor={id}
      className="w-1/2 p-10 cursor-pointer hover:bg-slate-200 border border-slate-200 flex gap-4 flex-col items-center justify-center text-slate-600 font-medium"
    >
      {icon}
      <p>{label}</p>
      <input
        id={id}
        className="hidden"
        type="file"
        accept=".md"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            readFile(file, (content) => {
              onChange(content);
            });
          }
        }}
      />
      <EditMarkdownSheet text={text} onSave={onChange}>
        <Button variant={"outline"} size={"icon"}>
          <Edit2Icon className="w-4 h-4" />
        </Button>
      </EditMarkdownSheet>
    </label>
  );
};

export default UploadInput;
