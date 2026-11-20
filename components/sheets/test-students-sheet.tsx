"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import { StudentPicker } from "@/components/ui/student-picker";
import { api, ENDPOINT } from "@/lib/api";
import { apiErrorMsg } from "@/lib/utils";
import useUsers from "@/hooks/useUsers";
import type { TSchedulePaper } from "@/models/SchedulePaper";
import type { TAnswerSheet } from "@/models/AnswerSheet";

type Props = {
  test: TSchedulePaper;
  batchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Change who takes a scheduled test: the whole batch, or chosen students.
 * Students who already started or submitted stay ticked and locked (the
 * server enforces the same rule).
 */
export function TestStudentsSheet({ test, batchId, open, onOpenChange }: Props) {
  const { users } = useUsers({ batchId });
  const wholeBatchTest = !test.students?.length;
  const [studentIds, setStudentIds] = useState<string[]>(test.students?.map(String) ?? []);
  const [attempted, setAttempted] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // A whole-batch test starts with every student ticked
  const [seeded, setSeeded] = useState(!wholeBatchTest);
  useEffect(() => {
    if (seeded || !users.length) return;
    setStudentIds((prev) => Array.from(new Set([...prev, ...users.map((u) => String(u._id))])));
    setSeeded(true);
  }, [seeded, users]);

  useEffect(() => {
    if (!open) return;
    api
      .get(ENDPOINT.answerSheets, { params: { scheduleId: test._id } })
      .then((res) => {
        const ids = ((res?.data?.data?.results ?? []) as TAnswerSheet[]).map((s) => String(s.user));
        setAttempted(ids);
        // Attempted students are always part of the list
        setStudentIds((prev) => Array.from(new Set([...prev, ...ids])));
      })
      .catch(() => {});
  }, [open, test._id]);

  // Everyone ticked = "whole batch" (null), so students added to the batch
  // later still get the test, as before.
  const everyone = users.length > 0 && users.every((u) => studentIds.includes(String(u._id)));

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(ENDPOINT.schedulePaper, { schedulePaperId: test._id, studentIds: everyone ? null : studentIds });
      toast.success(everyone ? "The whole batch takes this test" : `${studentIds.length} students take this test`);
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMsg(err, "Couldn't update the students"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Who takes this test"
      description={test.paper?.title}
      footer={
        <Button variant="brand" className="h-11 w-full gap-2" disabled={saving || studentIds.length === 0} onClick={save}>
          {saving ? <Loader2Icon className="size-4 animate-spin" /> : <UsersIcon className="size-4" />}
          Save
        </Button>
      }
    >
      <div className="flex flex-col gap-3 p-4">
        {attempted.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {attempted.length} student{attempted.length === 1 ? " has" : "s have"} already attempted it and can&apos;t be removed.
          </p>
        )}
        <StudentPicker batchId={batchId} value={studentIds} onChange={setStudentIds} lockedIds={attempted} />
      </div>
    </ResponsiveDrawer>
  );
}
