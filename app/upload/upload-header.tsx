"use client";

import SelectCompact from "@/components/ui/select-compact";
import { COURSES, MARKS, SUBJECT_MAP } from "@/data/const";
import React, { useState } from "react";
import useChapters from "@/hooks/useChapters";
import { TChapter } from "@/models/Chapter";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Loader2Icon } from "lucide-react";

type Props = {
  totalQuestion?: number;
  onUpload?: (chapter: string, marks: string) => Promise<void>;
};

const UploadHeader = ({ totalQuestion, onUpload }: Props) => {
  const [course, setCourse] = useState(COURSES[0]);
  const [subject, setSubject] = useState("");
  const { chapters } = useChapters(subject, course);
  const [chapter, setChapter] = useState("");
  const [marks, setMarks] = useState("1");
  const [loading, setLoading] = useState(false);
  return (
    <div className="px-6 py-3 flex flex-col lg:flex-row gap-8 items-center">
      <div className="flex flex-wrap gap-4 items-center flex-grow">
        <SelectCompact
          label="Class"
          placeholder="Select a class"
          className="w-[300px] "
          value={course}
          onChange={setCourse}
          options={COURSES.map((c) => ({
            label: c,
            value: c,
          }))}
        />
        <SelectCompact
          label="Subject"
          placeholder="Select a subject"
          className="w-[300px]"
          value={subject}
          onChange={setSubject}
          options={SUBJECT_MAP[course].map((c) => ({
            label: c,
            value: c,
          }))}
        />
        <SelectCompact
          label="Chapter"
          placeholder="Select a chapter"
          className="w-[300px]"
          value={chapter}
          onChange={setChapter}
          options={
            chapters?.map((c: TChapter) => ({
              label: c.title,
              value: c._id,
            })) ?? []
          }
        />
        <SelectCompact
          label="Marks"
          placeholder="Select marks"
          className="w-[140px]"
          value={marks}
          onChange={setMarks}
          options={
            MARKS?.map((mark) => ({
              label: mark.toString(),
              value: mark.toString(),
            })) ?? []
          }
        />
      </div>
      <div className="flex gap-4 ml-auto items-center whitespace-nowrap">
        <p>
          Total Questions: <strong>{totalQuestion || 0}</strong>
        </p>
        <Button
          disabled={loading}
          onClick={async () => {
            if (chapter) {
              setLoading(true);
              await onUpload?.(chapter, marks);
              setLoading(false);
            } else {
              toast({
                title:
                  "Please select a Class, Subject & Chapter to upload a question set.",
                variant: "destructive",
              });
            }
          }}
        >
          {loading && <Loader2Icon className="w-4 h-4 animate-spin mr-2" />}
          Upload Questions
        </Button>
      </div>
    </div>
  );
};

export default UploadHeader;
