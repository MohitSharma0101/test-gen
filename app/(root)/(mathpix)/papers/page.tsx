"use client";

import React, { useState } from "react";
import usePapers from "@/hooks/usePapers";
import { cn, getDateFromISO, getTotalMarks } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import PreviewButton from "@/components/ui/preview-button";
import { postUpdateUsage } from "@/service/core.service";
import DeleteButton from "@/components/ui/delete-button";
import { Edit2Icon, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SelectCompact from "@/components/ui/select-compact";
import { PaperStatus, PaperStatusOptions } from "@/data/const";
import Pagination from "@/components/ui/pagination";
import { SchedulePaperSheet } from "@/components/sheets/schedule-paper-sheet";
import { CalendarClockIcon } from "lucide-react";
import DataTable from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { MergeIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { MergePaperSheet } from "@/components/sheets/merge-paper-sheet";
import { ViewPaperSheet } from "@/components/sheets/view-paper-sheet";
import { useCourses } from "@/hooks/useCourses";
import { useAuthors } from "@/hooks/useAuthors";

type Props = {};

const PapersPage = (props: Props) => {
  const { authors, author, updateAuthor } = useAuthors();
  const { course, setCourse, courses } = useCourses({ stopDefaultSelection: true });
  const [schedulePaperId, setSchedulePaperId] = useState<string | null>(null);
  const [status, setStatus] = useState(PaperStatus.PUBLIC);
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
  const [openMergePapers, setOpenMergePapers] = useState(false);
  const [viewPaperId, setViewPaperId] = useState<string | null>();

  const { papers, data, loading, deletePaper, refresh } = usePapers({
    author,
    course,
    status,
  });

  const isFilterApplied = author || course;

  const onClearFilter = () => {
    if (author) updateAuthor();
    if (course) setCourse("");
    if (status) setStatus(PaperStatus.PUBLIC);
  };

  const getStatusColor = (status?: PaperStatus) => {
    switch (status) {
      case PaperStatus.PUBLIC:
        return "bg-green-500";
      case PaperStatus.PRIVATE:
        return "bg-black";
      case PaperStatus.DRAFT:
        return "bg-blue-500";
      default:
        return "bg-slate-500";
    }
  };

  const omMergePapers = () => {
    setOpenMergePapers(true);
  };

  return (
    <div className="p-2 lg:p-4">
      <div className="flex-1 rounded">
        <div className="rounded h-[52px] px-2 lg:px-4 border border-slate-200 bg-slate-300 text-sm font-medium flex gap-2 items-center">
          PAPERS {data?.totalPapers ? `(${data?.totalPapers})` : ""}
          <Button
            disabled={selectedPapers.length <= 1}
            variant={"outline"}
            size={"sm"}
            className="ml-auto"
            onClick={omMergePapers}
          >
            <MergeIcon className="size-4 mr-2" />
            Merge
          </Button>
          <Button variant={"outline"} size={"sm"} onClick={refresh}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="flex gap-2 lg:gap-4 items-center mt-3">
          <SelectCompact
            options={authors.map((a) => ({ label: a, value: a }))}
            placeholder="Author"
            value={author}
            onChange={updateAuthor}
            className="w-[200px]"
            canUnselect
          />
          <SelectCompact
            options={courses.map((a) => ({ label: a, value: a }))}
            placeholder="Class"
            value={course}
            onChange={setCourse}
            className="w-[200px]"
            canUnselect
          />
          <SelectCompact
            options={PaperStatusOptions}
            placeholder="Select Status"
            value={status}
            onChange={(v) => setStatus(v as PaperStatus)}
          />
          {isFilterApplied && (
            <Button size={"sm"} variant={"ghost"} className="underline px-1 hover:font-bold" onClick={onClearFilter}>
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
          <DataTable
            data={papers}
            className="pt-4"
            columns={[
              {
                header: "",
                cellClassName: "px-2",
                render: (paper) => (
                  <Checkbox
                    checked={selectedPapers?.includes(paper._id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPapers((prev) => [...prev, paper._id]);
                      } else {
                        setSelectedPapers((prev) => prev.filter((id) => id != paper._id));
                      }
                    }}
                  />
                ),
              },
              {
                header: "Title",
                accessor: "title",
                headerClassName: "text-left",
                render: (paper) => (
                  <div className="flex items-center justify-start text-left ">
                    <p className="w-[220px] font-medium">{paper.title}</p>
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
                  </div>
                ),
                className: "min-w-[200px]",
              },
              {
                header: "Total Q.",
                render: (paper) => paper.questions.length,
                className: "min-w-[80px]",
              },
              {
                header: "Author",
                render: (paper) => paper.author || "-",
                className: "w-[120px]",
              },
              {
                header: "Class",
                accessor: "course", // Assuming 'course' maps to 'Class'
                render: (paper) => <div className="text-right">{paper.course || "-"}</div>,
                className: "w-[120px]",
              },
              {
                header: "Status",
                render: (paper) => (
                  <Badge variant={"default"} className={cn("", getStatusColor(paper.status))}>
                    {paper.status ?? "-"}
                  </Badge>
                ),
                className: "w-[120px]",
              },
              {
                header: "Total Marks",
                render: (paper) => getTotalMarks(paper.questions),
                className: "w-[120px]",
              },
              {
                header: "Created At",
                render: (paper) => getDateFromISO(paper.createdAt),
                className: "w-[130px]",
              },
              {
                header: "Last Updated At",
                render: (paper) => getDateFromISO(paper.updatedAt),
                className: "w-[150px]",
              },
              {
                header: "Actions",
                render: (paper) => (
                  <div className="flex items-center justify-center gap-2">
                    <Button size={"icon"} variant={"outline"} onClick={() => setViewPaperId(paper._id)}>
                      <Edit2Icon className="w-4 h-4" />
                    </Button>
                    <DeleteButton onDelete={() => deletePaper(paper._id)} />
                  </div>
                ),
                className: "w-[100px] text-center",
                cellClassName: "flex items-center justify-center gap-2",
              },
            ]}
            loading={false}
            rowKey={(paper) => paper._id}
          />
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
        {openMergePapers && (
          <MergePaperSheet
            open={openMergePapers}
            onOpenChange={setOpenMergePapers}
            paperIds={selectedPapers}
            onClear={() => {
              setSelectedPapers([]);
              setOpenMergePapers(false);
            }}
            onRefresh={refresh}
          />
        )}
        {viewPaperId && (
          <ViewPaperSheet
            paperId={viewPaperId}
            open={!!viewPaperId}
            onOpenChange={(_open) => {
              if (!_open) setViewPaperId(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PapersPage;
