"use client";

import React, { ReactNode, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { PlusIcon } from "lucide-react";
import { Input } from "../ui/input";
import { api, ENDPOINT } from "@/lib/api";
import { toast } from "../ui/use-toast";
import useBatches from "@/hooks/useBatches";
import MultiSelect from "../ui/multi-select";

type Props = {
  children?: ReactNode;
  onSuccess?: () => void;
};

const AddUserSheet = ({ children, onSuccess }: Props) => {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { batches } = useBatches();
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  const isDisabled = !selectedFile || !selectedBatchIds.length;

  const onAddUser = async () => {
    try {
      if (isDisabled) {
        toast({
          title: "Error",
          variant: "destructive",
          description: "Please fill all required fields",
        });
        return;
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("batchIds", JSON.stringify(selectedBatchIds));

      await api.post(ENDPOINT.users, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast({
        title: "Success",
        variant: "success",
        description: "Users added and assigned to batch successfully",
      });

      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.error ?? "Something went wrong",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant={"outline"} className="p-2 w-fit h-fit bg-white">
            <PlusIcon className="w-4 h-4" />
            Add User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="min-w-fit">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            You can add multiple users using CSV file.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <MultiSelect
            options={batches.map((batch) => ({
              label: batch.name,
              value: batch._id,
            }))}
            onSelectChange={(value) => {
              setSelectedBatchIds(value.map((v) => v.value));
            }}
            selectedOptions={selectedBatchIds.map((id) => ({
              label: batches.find((batch) => batch._id === id)?.name ?? "",
              value: id,
            }))}
            className="flex-grow lg:w-full flex-wrap"
            label="Select batches"
            maxSelectionDisplay={3}
          />
          <Input
            type="file"
            accept=".csv"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button disabled={isDisabled} className="w-full" onClick={onAddUser}>
          Submit
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserSheet;
