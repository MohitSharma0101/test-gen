"use client";

import React from "react";
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

type Props = {};

const PapersPage = (props: Props) => {
  const { papers, loading, deletePaper, refresh } = usePapers();

  return (
    <div className="p-6">
      <div className="flex-1 rounded">
        <div className="rounded h-[52px] px-4 border border-slate-200 bg-slate-300 text-sm font-medium flex items-center justify-between">
          PAPERS
          <Button variant={"outline"} size={"sm"} onClick={refresh}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        {loading ? (
          <div className="w-full flex flex-col gap-2 mt-4">
            <Skeleton className="w-full h-[60px]" />
            <Skeleton className="w-full h-[60px]" />
            <Skeleton className="w-full h-[60px]" />
            <Skeleton className="w-full h-[60px]" />
          </div>
        ) : (
          <Table className="mt-4">
            <TableHeader className="border border-slate-300">
              <TableRow className="divide-x divide-slate-300 border-b border-slate-300">
                <TableHead className="min-w-[200px]">Title</TableHead>
                <TableHead className="w-[150px] text-right">
                  Total Marks
                </TableHead>
                <TableHead className="w-[150px] text-right">
                  Total Questions
                </TableHead>
                <TableHead className="w-[150px] text-right">
                  Created At
                </TableHead>
                <TableHead className="w-[150px] text-right">
                  Last Updated At
                </TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-300 border border-slate-300">
              {papers?.map((paper) => (
                <TableRow
                  key={paper._id}
                  className="divide-x divide-slate-300 border-slate-300"
                >
                  <TableCell className="font-medium  flex items-center justify-between">
                    <p className="w-[100px] md:w-fit">{paper.title}</p>
                    <PreviewButton
                      questions={paper.questions}
                      defaultTwoColumn
                      onPrint={() => postUpdateUsage(paper.questions)}
                      className="ml-4"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {paper.questions.length}
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
      </div>
    </div>
  );
};

export default PapersPage;
