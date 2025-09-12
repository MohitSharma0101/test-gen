"use client";

import AddFeeSheet from "@/components/sheets/add-fee-sheet";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/ui/data-table";
import SelectCompact from "@/components/ui/select-compact";
import useBatches from "@/hooks/useBatches";
import useFees from "@/hooks/useFees";
import { TUserWithFeeSummary } from "@/models/User";
import { InfoIcon } from "lucide-react";
import { Loader2Icon } from "lucide-react";
import { SquareMousePointerIcon } from "lucide-react";
import React, { useState } from "react";

const FeesPage = () => {
  const { batches } = useBatches();
  const [selectedBatchId, setSelectedBatchId] = useState<string>();

  const [openAddFeeSheet, setOpenAddFeeSheet] = useState(false);
  const [selectedUser, setSelectedUser] = useState<
    TUserWithFeeSummary | undefined
  >();

  const { fees, loading, refresh } = useFees({ batchId: selectedBatchId });

  return (
    <div>
      <div className="rounded py-2 px-2 md:px-6 border border-slate-200 bg-slate-300 flex gap-x-4 items-center justify-between flex-wrap sticky top-0 z-[10]">
        <h1 className="py-2 text-sm font-bold flex items-center gap-x-2 ">
          STUDENT FEES
        </h1>
      </div>

      <div className="max-w-[700px] mx-auto my-3 px-2">
        <div className="py-2 flex items-center justify-between flex-wrap gap-2 md:gap-4">
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
        <div className="flex flex-col rounded-md overflow-auto border bg-white mt-2">
          {loading ? (
            <Loader2Icon className="w-5 h-5 animate-spin mx-auto my-14" />
          ) : fees?.users && fees?.users?.length > 0 ? (
            <DataTable
              loading={loading}
              columns={[
                {
                  header: "Name",
                  accessor: "name",
                  className: "min-w-[140px]",
                },
                {
                  header: "Father Name",
                  accessor: "fatherName",
                  className: "min-w-[140px]",
                },
                {
                  header: "Due",
                  render: (user) => "₹" + (user.feeSummary?.due ?? 0),
                },
                {
                  header: "Paid",
                  render: (user) => "₹" + (user.feeSummary?.totalPaid ?? 0),
                },
                {
                  header: "Total",
                  render: (user) => "₹" + (user.feeSummary?.totalFee ?? 0),
                },
                {
                  header: "Details",
                  render: (user) => (
                    <Button
                      variant={"outline"}
                      size={"sm"}
                      onClick={() => {
                        setSelectedUser(user);
                        setOpenAddFeeSheet(true);
                      }}
                    >
                      <InfoIcon className="size-4 mr-2" /> View
                    </Button>
                  ),
                },
              ]}
              data={fees?.users}
              rowKey={(row) => row._id}
            />
          ) : (
            <div className="py-10 px-3 text-slate-400 text-sm md:text-base font-medium h-full flex gap-4 flex-col items-center justify-center">
              <SquareMousePointerIcon
                className="w-[100px] h-[100px]"
                strokeWidth={1.5}
              />
              Select a batch to view student fee info.
            </div>
          )}
        </div>
      </div>
      {selectedUser && (
        <AddFeeSheet
          user={selectedUser}
          open={openAddFeeSheet}
          onOpenChange={setOpenAddFeeSheet}
          onSuccess={refresh}
        />
      )}
    </div>
  );
};

export default FeesPage;
