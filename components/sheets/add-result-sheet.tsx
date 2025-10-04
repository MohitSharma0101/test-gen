import { Button } from "../ui/button";
import { Sheet, SheetContent } from "../ui/sheet";
import { TBatch } from "@/models/Batch";
import { Input } from "../ui/input";
import { useRef, useState } from "react";
import SelectCompact from "../ui/select-compact";
import { COURSES, SUBJECT_MAP } from "@/data/const";
import { api, ENDPOINT } from "@/lib/api";
import { toast } from "../ui/use-toast";
import { TExamResult } from "@/models/ExamResult";
import useUsers from "@/hooks/useUsers";
import { Loader2Icon } from "lucide-react";

type Props = {
  defaultExamResult?: TExamResult | null;
  batch: TBatch;
  date: string;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit?: () => void;
};

export const AddResultSheet = ({
  open,
  onOpenChange,
  batch,
  date,
  defaultExamResult,
  onSubmit,
}: Props) => {
  const { users, loading: usersLoading } = useUsers({
    batchId: batch._id,
    shouldLoad: !!batch._id,
  });

  const [totalMarks, setTotalMarks] = useState(
    defaultExamResult?.totalMarks ?? 100
  );
  const [name, setName] = useState(defaultExamResult?.name ?? "");
  const [course, setCourse] = useState(COURSES[0]);
  const [subject, setSubject] = useState(SUBJECT_MAP[course][0]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [results, setResults] = useState<Record<string, string>>(
    defaultExamResult?.results.reduce<Record<string, string>>((acc, curr) => {
      acc[curr.userId.toString()] = String(curr.marks);
      return acc;
    }, {}) ?? {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const viewMode = !!defaultExamResult;

  const onKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      } else {
        // If it's the last input, maybe submit or just blur
        e.currentTarget.blur();
      }
    }
  };

  const isFormInvalid = Boolean(!name || !totalMarks);

  const handleSubmit = async () => {
    if (viewMode || isFormInvalid) return;
    try {
      const resultsList = Object.entries(results);
      if (resultsList.some(([_, value]) => isNaN(Number(value)))) {
        toast({
          title: "Invalid values",
          variant: "destructive",
        });
        return;
      }
      setIsSubmitting(true);
      const payload = {
        name: name,
        batchId: batch?._id,
        subject,
        date,
        totalMarks: totalMarks,
        results: Object.entries(results).map(([key, value]) => ({
          userId: key,
          marks: Number(value),
        })),
      };
      await api.post(ENDPOINT.examResults, payload);
      toast({
        title: "Success",
        variant: "success",
        description: "Result added successfully",
      });
      onSubmit?.();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response.data.error,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={"right"}
        className="p-0 flex flex-col gap-2 max-h-screen"
      >
        <div className="text-base font-medium px-2 py-3 bg-gray-200 pr-9">
          {viewMode ? "View Result for " : "Add Result for "}
          <strong className="whitespace-nowrap">{batch.name}</strong> on{" "}
          <strong className="whitespace-nowrap">{date}</strong>
        </div>
        <div className="flex flex-col gap-3 px-3 py-2 flex-grow overflow-auto">
          <div className="grid grid-cols-3 gap-2">
            <Input
              disabled={viewMode}
              placeholder="Enter Exam Name"
              className="col-span-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              disabled={viewMode}
              placeholder="Enter Total Marks"
              type="number"
              min={0}
              value={totalMarks}
              onChange={(e) => setTotalMarks(parseInt(e.target.value))}
            />
          </div>
          {!viewMode && (
            <div className="grid grid-cols-2 gap-2">
              <SelectCompact
                placeholder="Select a class"
                className="w-full"
                value={course}
                onChange={setCourse}
                options={COURSES.map((c) => ({
                  label: c,
                  value: c,
                }))}
              />
              <SelectCompact
                disabled={viewMode}
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
          )}
          <p className="text-sm font-semibold pt-2">Add Marks</p>
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-200">
            {usersLoading ? (
              <Loader2Icon className="size-4 animate-spin my-4 mx-auto" />
            ) : (
              users?.map((user, index) => {
                return (
                  <div
                    key={user._id}
                    className="py-2 px-3 flex items-center gap-2"
                  >
                    {index + 1}.
                    <div className="flex-1 flex justify-between items-center gap-2">
                      <p className="text-sm font-medium">{user.name}</p>
                      <Input
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        disabled={viewMode}
                        placeholder="Marks"
                        className="w-1/4"
                        onKeyDown={(e) => onKeyDown(e, index)}
                        value={results[user._id]}
                        onChange={(e) => {
                          let value = e.target.value;
                          setResults((prev) => ({
                            ...prev,
                            [user._id]: value,
                          }));
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <Button
          disabled={viewMode || isSubmitting || isFormInvalid}
          className="mb-2 mx-2"
          onClick={handleSubmit}
        >
          Submit
        </Button>
      </SheetContent>
    </Sheet>
  );
};
