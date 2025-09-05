"use client";

import React, { useState } from "react";
import { Button } from "../ui/button";
import { api, ENDPOINT } from "@/lib/api";
import { toast } from "../ui/use-toast";
import { Sheet, SheetContent } from "../ui/sheet";
import LabelInput from "../ui/label-input";
import useUsers from "@/hooks/useUsers";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { TBatch } from "@/models/Batch";
import { TUser } from "@/models/User";

type Props = {
  defaultBatch?: TBatch;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const AddBatchSheet = ({
  defaultBatch,
  onSuccess,
  open,
  onOpenChange,
}: Props) => {
  const [name, setName] = useState(defaultBatch?.name ?? "");
  const [fee, setFee] = useState(defaultBatch?.fee ?? 0);
  const { users } = useUsers();
  const [query, setQuery] = useState("");
  const defaultSelectedUserIds = ((defaultBatch?.userIds ?? []) as TUser[]).map(
    (user) => user?._id
  );
  const [selectedUsers, setSelectedUsers] = useState(defaultSelectedUserIds);
  const editMode = !!defaultBatch;

  const filteredUsers = (users ?? []).filter((user) =>
    user.name.toLowerCase().includes(query.toLowerCase())
  );

  const onAddBatch = async () => {
    try {
      if (editMode) {
        await api.put(ENDPOINT.batches, {
          _id: defaultBatch?._id,
          name,
          userIds: selectedUsers,
          fee: fee,
        });
      } else {
        await api.post(ENDPOINT.batches, { name, fee });
      }
      toast({
        title: "Success",
        variant: "success",
        description: editMode
          ? "Batch updated successfully"
          : "Batch added successfully",
      });
      onOpenChange?.(false);
      setName("");
      setFee(0);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response.data.error,
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={"right"}
        className="p-0 flex flex-col gap-2 max-h-screen"
      >
        <div className="text-base font-medium px-2 py-3 bg-gray-200">
          {editMode ? "Edit Batch" : "Add Batch"}
        </div>
        <div className="flex flex-col gap-2 px-3 flex-grow overflow-auto">
          <LabelInput
            label="Batch Name"
            placeholder="eg: JEE-2025"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <LabelInput
            label="Batch Fee (₹)"
            placeholder="eg: 5000"
            value={fee}
            type="number"
            onChange={(e) => setFee(parseInt(e.target.value))}
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium flex items-center justify-between">
              Add Students
              <Button
                variant="link"
                size="sm"
                className="rounded-full underline"
                onClick={() => setSelectedUsers([])}
              >
                Remove All
              </Button>
            </label>
            <div className="flex flex-col border border-slate-200 rounded-md">
              <Input
                placeholder={"Search Students..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-b-none rounded-t-md"
              />
              {filteredUsers.map((user) => (
                <label
                  key={user.userId}
                  className="flex items-center py-2 px-2 gap-2 border-b last:border-b-none border-slate-200 cursor-pointer hover:bg-slate-100"
                >
                  <Checkbox
                    id={user._id}
                    checked={selectedUsers.includes(user._id)}
                    onCheckedChange={(checked) => {
                      setSelectedUsers(
                        checked
                          ? [...selectedUsers, user._id]
                          : selectedUsers.filter((id) => id !== user._id)
                      );
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-slate-500">
                      {user.phone} | {user.dob}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <Button className="mb-2 mx-2" onClick={onAddBatch}>
          Submit
        </Button>
      </SheetContent>
    </Sheet>
  );
};

export default AddBatchSheet;
