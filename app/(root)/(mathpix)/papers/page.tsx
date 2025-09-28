"use client";

import React, { useState } from "react";
import usePapers from "@/hooks/usePapers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDateFromISO, getTotalMarks } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import PreviewButton from "@/components/ui/preview-button";
import { postUpdateUsage } from "@/service/core.service";
import DeleteButton from "@/components/ui/delete-button";
import Link from "next/link";
import { Edit2Icon, RefreshCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import SelectCompact from "@/components/ui/select-compact";
import { AUTHORS } from "@/models/Author";
import { useAuthorStore } from "@/stores/authorStore";
import { COURSES } from "@/data/const";
import Pagination from "@/components/ui/pagination";
import { SchedulePaperSheet } from "@/components/sheets/schedule-paper-sheet";
import { CalendarClockIcon } from "lucide-react";

type Props = {};

const PapersPage = (props: Props) => {
  const { author, updateAuthor } = useAuthorStore();
  const [course, setCourse] = useState("");
  const [schedulePaperId, setSchedulePaperId] = useState<string | null>(null);
  const { papers, data, loading, deletePaper, refresh } = usePapers({
    author,
    course,
  });

  const isFilterApplied = author || course;

  const onClearFilter = () => {
    if (author) updateAuthor();
    if (course) setCourse("");
  };

  return (
    <div className="p-2 lg:p-4">
      <div className="flex-1 rounded">
        <div className="rounded h-[52px] px-2 lg:px-4 border border-slate-200 bg-slate-300 text-sm font-medium flex items-center justify-between">
          PAPERS {data?.totalPapers ? `(${data?.totalPapers})` : ""}
          <Button variant={"outline"} size={"sm"} onClick={refresh}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="flex gap-2 lg:gap-4 items-center mt-3">
          <SelectCompact
            options={AUTHORS.map((a) => ({ label: a, value: a }))}
            placeholder="Author"
            value={author}
            onChange={updateAuthor}
            className="w-[200px]"
            canUnselect
          />
          <SelectCompact
            options={COURSES.map((a) => ({ label: a, value: a }))}
            placeholder="Class"
            value={course}
            onChange={setCourse}
            className="w-[200px]"
            canUnselect
          />
          {isFilterApplied && (
            <Button
              size={"sm"}
              variant={"ghost"}
              className="underline px-1 hover:font-bold"
              onClick={onClearFilter}
            >
              Clear Filters
            </Button>
          )}
        </div>
        {loading ? (
          <div className="w-full flex flex-col gap-2 mt-2">
            <Skeleton className="w-full h-[60px]" />
            <Skeleton className="w-full h-[60px]" />
            <Skeleton className="w-full h-[60px]" />
            <Skeleton className="w-full h-[60px]" />
          </div>
        ) : (
          <Table className="mt-2">
            <TableHeader className="border border-slate-300">
              <TableRow className="divide-x divide-slate-300 border-b border-slate-300">
                <TableHead className="min-w-[200px]">Title</TableHead>
                <TableHead className="w-[130px] text-right">
                  Total Questions
                </TableHead>
                <TableHead className="w-[120px] text-right">Author</TableHead>
                <TableHead className="w-[120px] text-right">Class</TableHead>
                <TableHead className="w-[120px] text-right">
                  Total Marks
                </TableHead>
                <TableHead className="w-[130px] text-right">
                  Created At
                </TableHead>
                <TableHead className="w-[150px] text-right">
                  Last Updated At
                </TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-300 border border-slate-300">
              {papers.map((paper) => (
                <TableRow
                  key={paper._id}
                  className="divide-x divide-slate-300 border-slate-300"
                >
                  <TableCell className="font-medium  flex items-center">
                    <p className="w-[220px] ">{paper.title}</p>
                    <Button
                      variant={"outline"}
                      size={"icon"}
                      onClick={() => setSchedulePaperId(paper._id)}
                      className="ml-auto"
                    >
                      <CalendarClockIcon className="w-5 h-5" />
                    </Button>

                    <PreviewButton
                      questions={paper.questions}
                      defaultTwoColumn
                      onPrint={() => postUpdateUsage(paper.questions)}
                      className="ml-2"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {paper.questions.length}
                  </TableCell>
                  <TableCell className="text-right">
                    {paper.author || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {paper.course || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {getTotalMarks(paper.questions)}
                  </TableCell>
                  <TableCell className="text-right">
                    {getDateFromISO(paper.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {getDateFromISO(paper.updatedAt)}
                  </TableCell>
                  <TableCell className="text-center flex items-center justify-center gap-2">
                    <Link
                      href={`/papers/edit/${paper._id}`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "icon",
                      })}
                    >
                      <Edit2Icon className="w-4 h-4" />
                    </Link>
                    <DeleteButton onDelete={() => deletePaper(paper._id)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="my-4">
          <Pagination totalPages={data?.totalPages} hideLimit />
        </div>
        {schedulePaperId && (
          <SchedulePaperSheet
            paperId={schedulePaperId}
            open={Boolean(schedulePaperId)}
            onOpenChange={() => setSchedulePaperId(null)}
          />
        )}
      </div>
    </div>
  );
};

export default PapersPage;
