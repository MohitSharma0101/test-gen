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

type Props = {
  batch?: TBatch;
  onEdit?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const ViewBatchSheet = ({ batch, onEdit, open, onOpenChange }: Props) => {
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
              <div className="grid grid-cols-3 items-center py-2 px-2 gap-2 gap-x-6 border-b last:border-b-none border-slate-200">
                <p className="text-sm font-medium">Name</p>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm font-medium">Parent Phone</p>
              </div>
              <DataTable
                data={filteredUsers}
                loading={loading}
                columns={[
                  {
                    header: "Name",
                    accessor: "name",
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
        <Button className="mb-2 mx-2" onClick={onEdit}>
          Edit batch
        </Button>
      </SheetContent>
    </Sheet>
  );
};

export default ViewBatchSheet;
