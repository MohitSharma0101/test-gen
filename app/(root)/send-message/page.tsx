"use client";

import { useEffect, useState } from "react";
import { MessageCircleIcon, UsersIcon } from "lucide-react";
import SelectCompact from "@/components/ui/select-compact";
import WAButton from "@/components/ui/wa-button";
import { DatePicker } from "@/components/ui/date-picker";
import { TIME_OPTIONS } from "@/components/ui/date-time-picker";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/state-message";
import { Skeleton } from "@/components/ui/skeleton";
import { INPUT_FIELD, MSG_TEMPLATE, MSG_TEMPLATES_META, MSG_TEMPLATES_OPTIONS } from "@/data/const";
import { ROUTE_GROUPS } from "@/data/routes";
import { WA_MSG } from "@/data/wa-msg";
import useBatches from "@/hooks/useBatches";
import useExamResults from "@/hooks/useExamResult";
import useUsers from "@/hooks/useUsers";
import useAttendance from "@/hooks/useAttendance";
import Clock from "@/lib/clock";
import { cn } from "@/lib/utils";

type TMSG_TEMPLATE = keyof typeof MSG_TEMPLATE;

const TONE = ROUTE_GROUPS.daily.tile;

const Section = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => (
  <section className={cn("rounded-2xl border bg-card p-4 shadow-sm", className)}>
    <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
    {children}
  </section>
);

export default function SendMessagePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<TMSG_TEMPLATE>(MSG_TEMPLATE.EXTRA_CLASS);
  const { batches, loading: batchesLoading } = useBatches();

  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const selectedBatch = batches.find((batch) => batch._id === selectedBatchId);
  const { users, loading: userLoading } = useUsers({ batchId: selectedBatchId, shouldLoad: !!selectedBatchId });
  const today = Clock.getDate();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const selectedTemplateMeta = MSG_TEMPLATES_META[selectedTemplate];
  const { examResults, fetchExamResults } = useExamResults();
  const [selectedResultId, setSelectedResultId] = useState("");
  const selectedResult = examResults.find((res) => res._id === selectedResultId);

  const isAbsentTemplate = selectedTemplate === MSG_TEMPLATE.ABSENT;
  const { attendance } = useAttendance({
    batchId: selectedBatchId,
    date: selectedDate,
    shouldLoad: isAbsentTemplate,
  });

  // The absence message goes only to parents of that day's absentees
  const recipients = isAbsentTemplate
    ? users?.filter((user) => (attendance?.absentUsers as string[])?.includes(user._id))
    : users;

  useEffect(() => {
    if (selectedTemplate === MSG_TEMPLATE.RESULT) {
      setSelectedResultId("");
      fetchExamResults({ batchId: selectedBatchId, date: selectedDate });
    }
  }, [selectedTemplate, selectedDate, selectedBatchId, fetchExamResults]);

  const getWAMsg = (data: Record<string, any>) => {
    switch (selectedTemplate) {
      case MSG_TEMPLATE.EXTRA_CLASS:
        return WA_MSG.extraClass({ name: data.name, date: Clock.getDateInFormat(selectedDate), startTime, endTime });
      case MSG_TEMPLATE.ABSENT:
        return WA_MSG.absent(data.name, Clock.getDateInFormat(selectedDate), selectedBatch?.name || "");
      case MSG_TEMPLATE.RESULT: {
        const userMarks = selectedResult?.results?.find((res) => res.userId === data._id)?.marks;
        if (userMarks == undefined || userMarks == null) {
          return WA_MSG.resultAbsent({
            name: data.name,
            date: Clock.getDateInFormat(selectedResult?.date),
            subject: selectedResult?.subject ?? data.subject,
          });
        }
        return WA_MSG.result({
          name: data.name,
          date: Clock.getDateInFormat(selectedResult?.date),
          marks_obtained: userMarks,
          total_marks: selectedResult?.totalMarks ?? "",
          subject: selectedResult?.subject ?? "",
        });
      }
      case MSG_TEMPLATE.PTM:
        return WA_MSG.ptm({ name: data.name, date: Clock.getDateInFormat(selectedDate), startTime, endTime });
      case MSG_TEMPLATE.FEE_REMINDER:
        return WA_MSG.feesReminder(data.name);
    }
  };

  const extraFields = selectedTemplateMeta.extraFields;

  const renderField = (field: INPUT_FIELD) => {
    switch (field) {
      case INPUT_FIELD.DATE:
        return (
          <DatePicker
            key={field}
            label="Date"
            value={selectedDate}
            today={today}
            todayLabel="Today"
            onChange={setSelectedDate}
            className="col-span-2 sm:col-span-1"
          />
        );
      case INPUT_FIELD.RESULT_NAME:
        return (
          <SelectCompact
            key={field}
            options={examResults?.map((r) => ({ label: r.name, value: r._id }))}
            className="col-span-2 min-w-0 sm:col-span-1"
            placeholder="Select result"
            emptyState="No results for this batch on this date"
            label="Result"
            value={selectedResultId}
            onChange={setSelectedResultId}
          />
        );
      case INPUT_FIELD.TIME_RANGE:
        return (
          <div key={field} className="col-span-2 grid grid-cols-2 gap-3">
            <SelectCompact label="Starts" placeholder="Time" options={TIME_OPTIONS} value={startTime} onChange={setStartTime} className="min-w-0" />
            <SelectCompact label="Ends" placeholder="Time" options={TIME_OPTIONS} value={endTime} onChange={setEndTime} className="min-w-0" />
          </div>
        );
    }
  };

  const recipientList = () => {
    if (!selectedBatchId) {
      return (
        <EmptyState
          className="py-8"
          tone={TONE}
          icon={<UsersIcon />}
          title="Pick a batch"
          description="Its parents will be listed here with a WhatsApp button each."
        />
      );
    }
    if (userLoading || !recipients) {
      return (
        <div className="space-y-2" aria-busy="true" aria-label="Loading parents">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      );
    }
    if (recipients.length === 0) {
      return (
        <EmptyState
          className="py-8"
          tone={TONE}
          icon={<UsersIcon />}
          title={isAbsentTemplate ? "Nobody was absent" : "No students in this batch"}
          description={isAbsentTemplate ? "No absences are saved for this batch on this date." : undefined}
        />
      );
    }
    return (
      <ul className="divide-y">
        {recipients.map((user, index) => (
          <li key={user._id} className="flex min-h-12 items-center gap-3 py-2">
            <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{user.name}</span>
              {!user.parentPhone && <span className="block text-xs text-amber-700">No parent number saved</span>}
            </span>
            <WAButton phone={user.parentPhone} message={getWAMsg(user)} className="size-10 rounded-full hover:bg-emerald-50" />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-12 pt-5 sm:px-6">
      <PageHeader
        icon={<MessageCircleIcon />}
        tone={TONE}
        title="Send message"
        description="Send a WhatsApp message to each parent in a batch"
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <Section title="Message">
            {/* Templates as chips: five options, faster to tap than a dropdown */}
            <div role="radiogroup" aria-label="Template" className="flex flex-wrap gap-2">
              {MSG_TEMPLATES_OPTIONS.map((option) => {
                const active = option.value === selectedTemplate;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelectedTemplate(option.value as TMSG_TEMPLATE)}
                    className={cn(
                      "h-9 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                      active ? "border-brand bg-brand-soft text-brand" : "bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {option.label.replace(/ Template$/, "")}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <SelectCompact
                label="Batch"
                options={batches.map((batch) => ({ label: batch.name, value: batch._id }))}
                onChange={setSelectedBatchId}
                value={selectedBatchId}
                loading={batchesLoading}
                className="col-span-2 min-w-0 sm:col-span-1"
                placeholder="Select a batch"
              />
              {extraFields.map(renderField)}
            </div>
          </Section>

          {selectedTemplateMeta.preview && (
            <Section title="Preview">
              {/* Shown the way the parent will see it */}
              <div className="rounded-xl bg-[#efeae2] p-3">
                <div className="ml-auto max-w-[90%] whitespace-pre-wrap break-words rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm">
                  {selectedTemplateMeta.preview}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Names, dates and marks are filled in for each parent.</p>
            </Section>
          )}
        </div>

        <Section
          title={
            recipients && selectedBatchId
              ? `${recipients.length} ${isAbsentTemplate ? "absent" : "parents"}`
              : "Parents"
          }
          className="lg:sticky lg:top-[calc(var(--app-header-h)+1.25rem)]"
        >
          {recipientList()}
        </Section>
      </div>
    </main>
  );
}
