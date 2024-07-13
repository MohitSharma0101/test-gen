import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Button } from "./button";
import { CloudUploadIcon } from "lucide-react";
import { Input } from "./input";
import type { TQuestion } from "@/models/Question";
import { savePaper } from "@/service/core.service";

type Props = {
  questions: TQuestion[];
};

const SavePaperButton = ({ questions }: Props) => {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={questions.length === 0} variant={"outline"}>
          <CloudUploadIcon className="w-4 h-4 mr-2" />
          Save
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Test Paper</DialogTitle>
          <DialogDescription>
            This will create a test paper from the selected question and save it
            on the cloud. You can access it from anywhere.
          </DialogDescription>
        </DialogHeader>
        <div>
          <label className="text-xs font-medium pb-1">Paper Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title of your paper..."
          />
          {error && (
            <p className="text-destructive text-xs pt-0.5 font-medium">
              {error}
            </p>
          )}
          <div className="flex gap-4 justify-end pt-2 text-sm">
            <p>
              Selected Questions: <strong>{questions?.length || 0}</strong>
            </p>
            <p>
              Total Marks:{" "}
              <strong>
                {questions.reduce((sum, item) => sum + (item.mark || 1), 0)}
              </strong>
            </p>
          </div>
        </div>

        <Button
          disabled={questions.length === 0}
          onClick={async () => {
            if (title) {
              await savePaper(title, questions);
              setOpen(false);
              setTitle("");
            } else {
              setError("Please enter a title to save paper.");
            }
          }}
          className="w-fit ml-auto"
          size={"lg"}
        >
          <CloudUploadIcon className="w-4 h-4 mr-2" />
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default SavePaperButton;
