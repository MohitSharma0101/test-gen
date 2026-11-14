"use client";

import React, { ReactNode, useRef, useState } from "react";
import { Slot } from "@radix-ui/react-slot";
import { DownloadIcon, FileSpreadsheetIcon, Loader2Icon, PlusIcon, UploadIcon, UserPlusIcon } from "lucide-react";
import { Button } from "../ui/button";
import { ResponsiveDrawer } from "../ui/responsive-drawer";
import { api, ENDPOINT } from "@/lib/api";
import { toast } from "../ui/use-toast";
import useBatches from "@/hooks/useBatches";
import MultiSelect from "../ui/multi-select";
import EditUserSheet from "./edit-user-sheet";

type Props = {
  // The button that opens it; a default "Add User" button otherwise
  children?: ReactNode;
  onSuccess?: () => void;
};

// Add students: one at a time (opens the student form) or many from a CSV.
// The batches picked here apply to both.
const AddUserSheet = ({ children, onSuccess }: Props) => {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const { batches } = useBatches();
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [openSingleUserSheet, setOpenSingleUserSheet] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const canImport = Boolean(selectedFile) && selectedBatchIds.length > 0 && !importing;

  const onImport = async () => {
    if (!selectedFile || !canImport) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("batchIds", JSON.stringify(selectedBatchIds));
      await api.post(ENDPOINT.users, formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast({ title: "Students imported", description: "They were added to the selected batches.", variant: "success" });
      setOpen(false);
      setSelectedFile(null);
      onSuccess?.();
    } catch (err) {
      // The api client rejects with a plain Error carrying the server message
      toast({ title: "Couldn't import the file", description: (err as Error)?.message || "Please check the file and try again.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const addOne = () => {
    // One panel at a time: close this one, open the student form
    setOpen(false);
    setOpenSingleUserSheet(true);
  };

  return (
    <>
      <Slot onClick={() => setOpen(true)}>
        {children || (
          <Button variant="outline" className="gap-2">
            <PlusIcon className="size-4" /> Add User
          </Button>
        )}
      </Slot>

      <ResponsiveDrawer
        open={open}
        onOpenChange={setOpen}
        title="Add students"
        description="Add one student, or many at once from a CSV file."
      >
        <div className="space-y-4 p-4">
          <MultiSelect
            options={batches.map((batch) => ({ label: batch.name, value: batch._id }))}
            onSelectChange={(value) => setSelectedBatchIds(value.map((v) => v.value))}
            selectedOptions={selectedBatchIds.map((id) => ({
              label: batches.find((batch) => batch._id === id)?.name ?? "",
              value: id,
            }))}
            className="w-full flex-wrap"
            label="Batches (for new students)"
            maxSelectionDisplay={3}
          />

          <button
            type="button"
            onClick={addOne}
            className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <UserPlusIcon className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-bold">Add one student</span>
              <span className="block text-sm text-muted-foreground">Fill in a short form</span>
            </span>
          </button>

          <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm" aria-labelledby="csv-import">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <FileSpreadsheetIcon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p id="csv-import" className="font-bold">
                  Import from CSV
                </p>
                <p className="text-sm text-muted-foreground">One student per row, added to the batches above.</p>
              </div>
            </div>
            <a href="/templates/Users.csv" download className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
              <DownloadIcon className="size-4" aria-hidden="true" /> Download the template
            </a>
            <input
              ref={fileInput}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            <Button variant="outline" onClick={() => fileInput.current?.click()} className="h-11 w-full justify-start gap-2">
              <UploadIcon className="size-4" />
              <span className="truncate">{selectedFile ? selectedFile.name : "Choose a CSV file"}</span>
            </Button>
            {!selectedBatchIds.length && selectedFile && (
              <p className="text-xs font-medium text-amber-700">Pick at least one batch above.</p>
            )}
            <Button variant="brand" onClick={onImport} disabled={!canImport} className="h-11 w-full gap-2">
              {importing && <Loader2Icon className="size-4 animate-spin" />}
              Import students
            </Button>
          </section>
        </div>
      </ResponsiveDrawer>

      {openSingleUserSheet && (
        <EditUserSheet
          open={openSingleUserSheet}
          onOpenChange={setOpenSingleUserSheet}
          onSuccess={() => onSuccess?.()}
          selectedBatchIds={selectedBatchIds}
        />
      )}
    </>
  );
};

export default AddUserSheet;
