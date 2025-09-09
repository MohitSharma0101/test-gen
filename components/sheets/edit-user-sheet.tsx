"use client";

import { Sheet, SheetContent } from "../ui/sheet";
import React, { useState } from "react";
import { Button } from "../ui/button";
import LabelInput from "../ui/label-input";
import { TUser } from "@/models/User";
import { api, ENDPOINT } from "@/lib/api";
import { toast } from "../ui/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  defaultUser?: Partial<TUser>;
  selectedBatchIds?: string[];
  onSuccess?: () => void;
};

const inputConfig = [
  { label: "Name", key: "name" },
  { label: "Email", key: "email" },
  { label: "Phone", key: "phone" },
  { label: "DOB (YYYY-MM-DD)", key: "dob" },
  { label: "Father Name", key: "fatherName" },
  { label: "Mother Name", key: "motherName" },
  { label: "Parent Phone", key: "parentPhone" },
  { label: "School", key: "school" },
] satisfies {
  label: string;
  key: keyof TUser;
}[];

const EditUserSheet = ({
  defaultUser,
  open,
  selectedBatchIds,
  onOpenChange,
  onSuccess,
}: Props) => {
  const [user, setUser] = useState(defaultUser);
  const editMode = !!defaultUser;

  const onUpdateUser = async () => {
    if (!user) return;
    try {
      const payload = {
        name: user.name,
        dob: user.dob,
        parentPhone: user.parentPhone,
        phone: user.phone,
        email: user.email,
        fatherName: user.fatherName,
        motherName: user.motherName,
        school: user.school,
      };
      if (editMode) {
        await api.put(ENDPOINT.users, { _id: user._id, ...payload });
      } else {
        await api.post(ENDPOINT.users, {
          user: payload,
          batchIds: selectedBatchIds,
        });
      }
      onSuccess?.();
      toast({
        title: editMode ? "User updated!" : "User Added",
        variant: "success",
      });
    } catch (err) {
      console.log(err);
      toast({
        title: "Unable to update user!",
        variant: "destructive",
      });
    } finally {
      onOpenChange(false);
    }
  };

  const onUserChange = (key: keyof TUser, value: string) => {
    setUser((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={"right"}
        className="p-0 flex flex-col gap-2 max-h-screen"
      >
        <div className="text-base font-medium px-2 py-3 bg-gray-200">
          {editMode ? "Edit" : "Add"} User
        </div>
        <div className="flex flex-col gap-2 px-3 flex-grow overflow-auto">
          {inputConfig.map((config) => (
            <LabelInput
              key={config.key}
              label={config.label}
              placeholder="Enter value"
              value={user?.[config.key]}
              onChange={(e) => onUserChange(config.key, e.target.value)}
            />
          ))}
        </div>
        <Button className="mb-2 mx-2" onClick={onUpdateUser}>
          Submit
        </Button>
      </SheetContent>
    </Sheet>
  );
};

export default EditUserSheet;
