"use client";

import React, { useState } from "react";
import { Button } from "../ui/button";
import { Sheet, SheetContent } from "../ui/sheet";
import { Input } from "../ui/input";
import { TBatch } from "@/models/Batch";
import CallButton from "../ui/call-button";
import DataTable from "../ui/data-table";
import LabelInput from "../ui/label-input";
import useUsers from "@/hooks/useUsers";
import DeleteButton from "../ui/delete-button";
import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";

type Props = {
  batch?: TBatch;
  onEdit?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  isArchived?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const ViewBatchSheet = ({
  batch,
  onEdit,
  onArchive,
  onUnarchive,
  isArchived,
  open,
  onOpenChange,
}: Props) => {

  const { users, loading } = useUsers({ batchId: batch?._id });
  const [query, setQuery] = useState("");

  const filteredUsers = (users ?? []).filter((user) =>
    user.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={"right"}
        className="p-0 flex flex-col gap-2 max-h-screen"
      >
        <div className="text-base font-medium px-2 py-3 bg-gray-200">
          {batch?.name}
        </div>
        <div className="flex flex-col gap-2 px-3 flex-grow overflow-auto">
          <div className="flex flex-col gap-2">
            <LabelInput label="Batch Fee" value={batch?.fee || "-"} disabled />
            <label className="text-sm font-medium flex items-center justify-between">
              Students
            </label>
            <div className="flex flex-col border border-slate-200 rounded-md overflow-auto">
              <Input
                placeholder={"Search Students..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-b-none rounded-t-md"
              />
              <DataTable
                data={filteredUsers}
                loading={loading}
                columns={[
                  {
                    header: "Sr.",
                    render: (_, index) => index + 1,
                  },
                  {
                    header: "Name",
                    accessor: "name",
                    className: "min-w-[120px]"
                  },
                  {
                    header: "Phone",
                    accessor: "phone",
                    render: (row) => (
                      <CallButton phoneNumber={row.phone} showNumberOnly />
                    ),
                  },
                  {
                    header: "Parent Phone",
                    accessor: "parentPhone",
                    render: (row) => (
                      <CallButton
                        phoneNumber={row.parentPhone}
                        showNumberOnly
                      />
                    ),
                  },
                ]}
                rowKey={(row) => row.userId}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 mb-2 mx-2">
          {!isArchived && onEdit && (
            <Button onClick={onEdit}>Edit batch</Button>
          )}
          {isArchived ? (
            <DeleteButton
              className="w-full"
              size="default"
              variant="outline"
              title="Restore batch"
              description={`Restore "${batch?.name}" to the active batch list?`}
              confirmText="Restore"
              onDelete={(closeDialog) => {
                onUnarchive?.();
                closeDialog();
              }}
            >
              <ArchiveRestoreIcon className="w-4 h-4 mr-2" />
              Restore batch
            </DeleteButton>
          ) : (
            onArchive && (
              <DeleteButton
                className="w-full"
                size="default"
                variant="outline"
                title="Archive batch"
                description={`Are you sure you want to archive "${batch?.name}"? It will be hidden from the batch list but student assignments are kept.`}
                confirmText="Archive"
                onDelete={(closeDialog) => {
                  onArchive();
                  closeDialog();
                }}
              >
                <ArchiveIcon className="w-4 h-4 mr-2" />
                Archive batch
              </DeleteButton>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ViewBatchSheet;
