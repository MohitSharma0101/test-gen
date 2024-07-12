"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { TPaper } from "@/models/Paper";
import { InboxIcon } from "lucide-react";
import React from "react";
import PaperItem from "./paper-item";
import usePapers from "@/hooks/usePapers";

type Props = {};

const PapersPage = (props: Props) => {
  const { papers, loading, deletePaper } = usePapers();

  return (
    <div className="p-6">
      <div className="flex-1 rounded">
        <div className="rounded h-[52px] px-4 border border-slate-200 bg-slate-300 text-sm font-medium flex items-center ">
          PAPERS
        </div>
        <ol className="rounded mt-1 max-h-full flex flex-col overflow-scroll py-2  sticky top-0 bg-slate-200">
          {loading ? (
            <>
              <Skeleton className="h-[32px] mx-4 my-1 bg-slate-300 rounded-full" />
              <Skeleton className="h-[32px] mx-4 my-1 bg-slate-300 rounded-full" />
              <Skeleton className="h-[32px] mx-4 my-1 bg-slate-300 rounded-full" />
              <Skeleton className="h-[32px] mx-4 my-1 bg-slate-300 rounded-full" />
            </>
          ) : !papers || papers?.length === 0 ? (
            <div className="py-8 px-4 text-slate-600 flex items-center flex-col justify-center">
              <InboxIcon className="w-[62px] h-[62px]" />
              No paper found!
            </div>
          ) : (
            papers?.map((paper: TPaper, index: number) => (
              <PaperItem
                paper={paper}
                key={paper._id}
                index={index}
                onDelete={deletePaper}
                // onUpdate={updatePaper}
              />
            ))
          )}
        </ol>
      </div>
    </div>
  );
};

export default PapersPage;
