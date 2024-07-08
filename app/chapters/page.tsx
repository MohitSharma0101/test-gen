"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SelectCompact from "@/components/ui/select-compact";
import { Skeleton } from "@/components/ui/skeleton";
import { COURSES, SUBJECT_MAP } from "@/data/const";
import useChapters from "@/hooks/useChapters";
import { TChapter } from "@/models/Chapter";
import { InboxIcon, Trash2Icon } from "lucide-react";
import React, { useState } from "react";

type Props = {};

const ChaptersPage = (props: Props) => {
  const [course, setCourse] = useState(COURSES[0]);
  const [subject, setSubject] = useState("");
  const {
    chapters,
    loading: chaptersLoading,
    addChapter,
    deleteChapter,
  } = useChapters(subject, course);
  const [chapterTitle, setChapterTitle] = useState("");

  const onAddChapter = async () => {
    await addChapter(chapterTitle);
    setChapterTitle("");
  };

  const onDeleteChapter = async (id: string) => {
    await deleteChapter(id);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <div className="flex gap-4">
            <SelectCompact
              label="Class"
              placeholder="Select a class"
              className="w-full "
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
              className="w-full"
              value={subject}
              onChange={setSubject}
              options={SUBJECT_MAP[course].map((c) => ({
                label: c,
                value: c,
              }))}
            />
          </div>
          <div className="mt-2">
            <p className="mb-2 ml-1 text-sm">Chapter Title</p>
            <Input
              value={chapterTitle}
              onChange={(e) => {
                setChapterTitle(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onAddChapter();
                }
              }}
              placeholder="Enter chapter title..."
            />
            <Button className="mt-2" onClick={onAddChapter}>
              Add Chapter
            </Button>
          </div>
        </div>
        <div className="flex-1 rounded">
          <div className="rounded h-[52px] px-4 border border-slate-200 bg-slate-300 text-sm font-medium flex items-center ">
            CHAPTERS
          </div>
          <ol className="rounded mt-1 max-h-full flex flex-col overflow-scroll py-2  sticky top-0 bg-slate-200">
            {chaptersLoading ? (
              <>
                <Skeleton className="h-[22px] mx-4 my-1 bg-slate-300 rounded-full" />
                <Skeleton className="h-[22px] mx-4 my-1 bg-slate-300 rounded-full" />
                <Skeleton className="h-[22px] mx-4 my-1 bg-slate-300 rounded-full" />
                <Skeleton className="h-[22px] mx-4 my-1 bg-slate-300 rounded-full" />
              </>
            ) : !chapters || chapters?.length === 0 ? (
              <div className="py-8 px-4 text-slate-600 flex items-center flex-col justify-center">
                <InboxIcon className="w-[62px] h-[62px]" />
                No chapter found!
              </div>
            ) : (
              chapters?.map((q: TChapter, index: number) => (
                <li
                  key={index}
                  className="text-start p-4 justify-start items-center rounded-none border-b last:border-none border-slate-300 flex "
                >
                  {`${index + 1}. ${q.title}`}
                  <Button
                    variant={"destructive"}
                    size={"icon"}
                    className="ml-auto"
                    onClick={() => onDeleteChapter(q._id)}
                  >
                    <Trash2Icon className="w-4 h-4 text-destructive-foreground" />
                  </Button>
                </li>
              ))
            )}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ChaptersPage;
