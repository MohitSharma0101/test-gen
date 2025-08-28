"use client";

import SelectCompact from "@/components/ui/select-compact";
import WAButton from "@/components/ui/wa-button";
import {
  INPUT_FIELD,
  MSG_TEMPLATE,
  MSG_TEMPLATES_META,
  MSG_TEMPLATES_OPTIONS,
} from "@/data/const";
import { WA_MSG } from "@/data/wa-msg";
import useBatches from "@/hooks/useBatches";
import Clock from "@/lib/clock";
import { TUser } from "@/models/User";
import { SquareMousePointerIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import useExamResults from "@/hooks/useExamResult";
import LabelInput from "@/components/ui/label-input";

type TMSG_TEMPLATE = keyof typeof MSG_TEMPLATE;

export default function SendMessagePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<TMSG_TEMPLATE>(
    MSG_TEMPLATE.EXTRA_CLASS
  );
  const { batches } = useBatches({ populateUsers: true });
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const selectedBatch = batches.find((batch) => batch._id === selectedBatchId);
  const [selectedDate, setSelectedDate] = useState<string>(Clock.getDate());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const selectedTemplateMeta = MSG_TEMPLATES_META[selectedTemplate];
  const { examResults, fetchExamResults } = useExamResults();
  const [selectedResultId, setSelectedResultId] = useState("");
  const selectedResult = examResults.find(
    (res) => res._id === selectedResultId
  );

  const usersToShow = selectedBatch?.userIds as TUser[];

  useEffect(() => {
    if (selectedTemplate === MSG_TEMPLATE.RESULT) {
      setSelectedResultId("");
      fetchExamResults({
        batchId: selectedBatchId,
        date: selectedDate,
      });
    }
  }, [selectedTemplate, selectedDate, selectedBatchId]);

  const getWAMsg = (data: Record<string, string>) => {
    switch (selectedTemplate) {
      case MSG_TEMPLATE.EXTRA_CLASS:
        return WA_MSG.extraClass({
          name: data.name,
          date: selectedDate,
          startTime,
          endTime,
        });

      case MSG_TEMPLATE.ABSENT:
        return WA_MSG.absent(
          data.name,
          selectedDate,
          selectedBatch?.name || ""
        );
      case MSG_TEMPLATE.RESULT:
        const userMarks = selectedResult?.results?.find(
          (res) => res.userId === data._id
        )?.marks;
        if (!userMarks) {
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
          total_marks: selectedResult?.totalMarks,
          subject: selectedResult?.subject,
        });
      case MSG_TEMPLATE.PTM:
        return WA_MSG.ptm({
          name: data.name,
          date: selectedDate,
          startTime,
          endTime,
        });
      case MSG_TEMPLATE.FEE_REMINDER:
        return WA_MSG.feesReminder(data.name);
    }
  };

  const renderExtraFields = () => {
    const extraFields = selectedTemplateMeta.extraFields;
    if (extraFields.length == 0) return;

    return (
      <>
        <p className="font-bold text-xs">ADDITIONAL DATA</p>
        <div className="flex flex-wrap gap-2 items-center mt-2">
          {extraFields.map((field, index) => {
            switch (field) {
              case INPUT_FIELD.DATE:
                return (
                  <LabelInput
                    label="Date"
                    key={field + index}
                    type="date"
                    className="w-fit"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                );
              case INPUT_FIELD.RESULT_NAME:
                return (
                  <SelectCompact
                    options={examResults?.map((r) => ({
                      label: r.name,
                      value: r._id,
                    }))}
                    className="w-[250px]"
                    placeholder="Select result"
                    label="Result"
                    value={selectedResultId}
                    onChange={setSelectedResultId}
                  />
                );
              case INPUT_FIELD.TIME_RANGE:
                return (
                  <>
                    <LabelInput
                      label="Start time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                    <LabelInput
                      label="End time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </>
                );
            }
          })}
        </div>
      </>
    );
  };

  return (
    <div>
      <div>
        <div className="rounded py-1 px-2 md:px-6 border border-slate-200 bg-slate-300 flex gap-x-4 items-center justify-between flex-wrap sticky top-0 ">
          <div className="py-2 w-full flex items-center justify-between flex-wrap gap-2 md:gap-4">
            <h1 className="py-2 text-sm font-bold flex items-center gap-x-2">
              SEND MESSAGE
            </h1>
            <SelectCompact
              options={MSG_TEMPLATES_OPTIONS}
              onChange={(value) => setSelectedTemplate(value as TMSG_TEMPLATE)}
              value={selectedTemplate}
              placeholder="Select a template"
            />
          </div>
        </div>
        <div className="p-2 max-w-[700px] mx-auto">
          <p className="font-bold text-xs">SELECT A SOURCE</p>
          <div className="py-2 grid grid-cols-2 gap-2 md:gap-4">
            <SelectCompact
              options={batches.map((batch) => ({
                label: batch.name,
                value: batch._id,
              }))}
              onChange={(value) => {
                setSelectedBatchId(value);
              }}
              value={selectedBatchId}
              className="flex-grow lg:w-[300px]"
              placeholder="Select a batch"
            />
          </div>
          {renderExtraFields()}
          {selectedTemplateMeta.preview && (
            <>
              <p className="font-bold text-xs my-2">PREVIEW</p>
              <Textarea
                disabled
                value={selectedTemplateMeta.preview}
                rows={10}
                className="disabled:opacity-100 disabled:cursor-pointer"
              />
            </>
          )}
        </div>
      </div>
      <div className="max-w-[700px] mx-auto my-3 px-2">
        {!usersToShow ? (
          <div className="py-10 px-3 text-slate-400 text-sm md:text-base font-medium h-full flex gap-4 flex-col items-center justify-center">
            <SquareMousePointerIcon
              className="w-[100px] h-[100px]"
              strokeWidth={1.5}
            />
            Select a source to send message
          </div>
        ) : (
          <div className="my-3 bg-white rounded-lg border border-slate-200 divide-y divide-slate-200">
            {usersToShow?.map((user, index) => (
              <div key={user._id} className="py-2 px-3 flex items-center gap-2">
                {index + 1}.
                <div className="flex-1">
                  <p className="text-sm font-medium">{user.name}</p>
                </div>
                <WAButton phone={user.parentPhone} message={getWAMsg(user)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
