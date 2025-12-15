import { TAccount } from "@/models/Account";
import { Sheet, SheetContent } from "../ui/sheet";
import LabelInput from "../ui/label-input";
import { useState } from "react";
import { COURSES, Role, SUBJECT_MAP } from "@/data/const";
import { useCourses } from "@/hooks/useCourses";
import SelectCompact from "../ui/select-compact";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { XIcon } from "lucide-react";
import { api, ENDPOINT } from "@/lib/api";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAccount?: TAccount;
  onSave?: () => void;
};

export default function EditAccountSheet({ open, onOpenChange, defaultAccount, onSave }: Props) {
  const [name, setName] = useState(defaultAccount?.name ?? "");
  const [role, setRole] = useState(defaultAccount?.role ?? Role.TEACHER);
  const [selectedCourses, setSelectedCourses] = useState(defaultAccount?.courses ?? []);
  const { course, subject, setCourse, setSubject } = useCourses();

  const onAddCourse = () => {
    if (!course || !subject) return;

    setSelectedCourses((prev) => {
      const existingCourse = prev.find((c) => c.course === course);

      // Course already exists → add subject
      if (existingCourse) {
        if (existingCourse.subjects.includes(subject)) return prev;

        return prev.map((c) => (c.course === course ? { ...c, subjects: [...c.subjects, subject] } : c));
      }

      // New course
      return [
        ...prev,
        {
          course,
          subjects: [subject],
        },
      ];
    });
  };

  const onRemoveCourse = (course: string, subject: string) => {
    setSelectedCourses((prev) =>
      prev
        .map((c) => (c.course === course ? { ...c, subjects: c.subjects.filter((s) => s !== subject) } : c))
        .filter((c) => c.subjects.length > 0)
    );
  };

  const onSubmit = async () => {
    try {
      await api.post(ENDPOINT.accounts, {
        accountId: defaultAccount?._id,
        name: name,
        role: role,
        courses: selectedCourses,
      });
      toast.success("Account Updated!");
      onSave?.();
    } catch (err) {
      console.log("err", err);
      toast.error("Unable to update account.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={"right"} className="p-0 flex flex-col gap-2 max-h-screen">
        <div className="text-base font-medium px-2 py-3 bg-gray-200">Edit - {defaultAccount?.username}</div>
        <div className="flex flex-col gap-2 px-3 flex-grow overflow-auto">
          <LabelInput
            label="Account Name"
            placeholder="Enter account name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <SelectCompact
            label="Role"
            placeholder="Select role"
            value={role}
            onChange={(value) => setRole(value as Role)}
            options={Object.values(Role).map((role) => ({ label: role, value: role }))}
          />
          <div>
            <p className="text-sm font-semibold">Courses</p>
            <div className="flex flex-wrap gap-2 items-end py-2">
              <SelectCompact
                label="Class"
                placeholder="Select class"
                className="min-w-[100px]"
                value={course}
                onChange={setCourse}
                options={
                  COURSES.map((c) => ({
                    label: c,
                    value: c,
                  })) ?? []
                }
              />
              <SelectCompact
                label="Subject"
                placeholder="Select subject"
                className="min-w-[100px]"
                value={subject}
                onChange={setSubject}
                options={
                  SUBJECT_MAP[course]?.map((c) => ({
                    label: c,
                    value: c,
                  })) ?? []
                }
              />
              <Button onClick={onAddCourse}>Add</Button>
            </div>
            <div className="flex items-center flex-wrap gap-2 pt-2">
              {selectedCourses?.flatMap(
                (c) =>
                  c.subjects?.map((s) => {
                    const value = `${c.course}-${s}`;
                    return (
                      <Badge
                        key={value}
                        variant={"secondary"}
                        className="text-sm font-medium whitespace-nowrap cursor-pointer"
                        onClick={() => onRemoveCourse(c.course, s)}
                      >
                        {value}
                        <XIcon className="size-4 ml-1" />
                      </Badge>
                    );
                  }) ?? []
              )}
            </div>
          </div>
          <Button className="mb-2 mx-2 mt-auto" onClick={onSubmit}>
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
