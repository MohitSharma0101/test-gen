"use client";

import { Input } from "@/components/ui/input";
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
import { ChangeEvent, useState } from "react";
import { parse } from "csv-parse/sync";
import { Textarea } from "@/components/ui/textarea";

type TMSG_TEMPLATE = keyof typeof MSG_TEMPLATE;

export default function SendMessagePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<TMSG_TEMPLATE>(
    MSG_TEMPLATE.EXTRA_CLASS
  );
  const { batches } = useBatches({ populateUsers: true });
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const selectedBatch = batches.find((batch) => batch._id === selectedBatchId);
  const [selectedDate, setSelectedDate] = useState<string>(Clock.getDate());
  const [uploadedUsers, setUploadedUser] = useState<any[]>();

  const selectedTemplateMeta = MSG_TEMPLATES_META[selectedTemplate];

  const usersToShow = (uploadedUsers ?? selectedBatch?.userIds) as TUser[];

  const getWAMsg = (data: Record<string, string>) => {
    switch (selectedTemplate) {
      case MSG_TEMPLATE.EXTRA_CLASS:
        return WA_MSG.extraClass(data.name, selectedDate);

      case MSG_TEMPLATE.ABSENT:
        return WA_MSG.absent(
          data.name,
          selectedDate,
          selectedBatch?.name || ""
        );
    }
  };

  const renderExtraFields = () => {
    const extraFields = selectedTemplateMeta.extraFields;
    if (extraFields.length == 0) return;

    return (
      <>
        <p className="font-bold text-xs">ADDITIONAL DATA</p>
        {extraFields.map((field) => {
          switch (field) {
            case INPUT_FIELD.DATE:
              return (
                <Input
                  type="date"
                  className="w-fit mt-2"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              );
          }
        })}
      </>
    );
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const csvText = await file.text();

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const users = records.map((row: any) => ({
      name: row.name,
      phone: row.phone,
      fatherName: row.father_name,
      motherName: row.mother_name,
      parentPhone: row.parent_phone,
      school: row.school,
      email: row.email,
      dob: row.dob,
    }));

    setUploadedUser(users);
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
            <Input type="file" accept=".csv" onChange={handleFileChange} />
          </div>
          {renderExtraFields()}
          {selectedTemplateMeta.preview && (
            <>
              <p className="font-bold text-xs my-2">PREVIEW</p>
              <Textarea disabled value={selectedTemplateMeta.preview} rows={10} className="disabled:opacity-100 disabled:cursor-pointer" />
            </>
          )}
        </div>
      </div>
      <div className="max-w-[700px] mx-auto my-3 px-2">
        {!selectedBatchId || !selectedTemplate ? (
          <div className="py-10 px-3 text-slate-400 text-sm md:text-base font-medium h-full flex gap-4 flex-col items-center justify-center">
            <SquareMousePointerIcon
              className="w-[100px] h-[100px]"
              strokeWidth={1.5}
            />
            Select a template and source to send message
          </div>
        ) : (
          <div className="my-3 bg-white rounded-lg border border-slate-200 divide-y divide-slate-200">
            {usersToShow?.map((user, index) => (
              <div key={user._id} className="py-2 px-3 flex items-center gap-2">
                {index + 1}.
                <div className="flex-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-slate-500">
                    {user.phone} | {user.dob}
                  </p>
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
