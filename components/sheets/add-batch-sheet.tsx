"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2Icon, SearchIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import LabelInput from "../ui/label-input";
import { Skeleton } from "../ui/skeleton";
import { ResponsiveDrawer } from "../ui/responsive-drawer";
import { toast } from "../ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import useUsers from "@/hooks/useUsers";
import { TBatch } from "@/models/Batch";

type Props = {
  defaultBatch?: TBatch;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

// Create or edit a batch: name, fee, and which students are in it
const AddBatchSheet = ({ defaultBatch, onSuccess, open = false, onOpenChange }: Props) => {
  const editMode = !!defaultBatch;

  const [name, setName] = useState(defaultBatch?.name ?? "");
  // Kept as typed so the field can be empty; parsed on save
  const [fee, setFee] = useState(defaultBatch?.fee ? String(defaultBatch.fee) : "");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const { users, loading: usersLoading } = useUsers();
  const { users: members, loading: membersLoading } = useUsers({ batchId: defaultBatch?._id, shouldLoad: editMode });
  const memberIds = useMemo(() => members.map((u) => u._id), [members]);

  // null until the current members have loaded (edit), so a quick save can't
  // compute "removed" against an empty list
  const [selected, setSelected] = useState<string[] | null>(editMode ? null : []);
  const sawLoading = useRef(false);
  useEffect(() => {
    if (membersLoading) sawLoading.current = true;
    else if (sawLoading.current && selected === null) setSelected(memberIds);
  }, [membersLoading, memberIds, selected]);

  const selectedSet = useMemo(() => new Set(selected ?? []), [selected]);
  const q = query.trim().toLowerCase();
  const filtered = (users ?? []).filter(
    (u) => !q || (u.name ?? "").toLowerCase().includes(q) || (u.userId ?? "").toLowerCase().includes(q)
  );

  const feeNumber = fee.trim() === "" ? 0 : Number(fee);
  const feeValid = Number.isFinite(feeNumber) && feeNumber >= 0;
  const canSave = Boolean(name.trim()) && feeValid && selected !== null && !saving;

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => (on ? [...(prev ?? []), id] : (prev ?? []).filter((x) => x !== id)));

  const onSave = async () => {
    if (!canSave || !selected) return;
    setSaving(true);
    try {
      if (editMode) {
        await api.put(ENDPOINT.batches, {
          _id: defaultBatch?._id,
          name: name.trim(),
          fee: feeNumber,
          userIds: selected,
          usersToAdd: selected.filter((id) => !memberIds.includes(id)),
          usersToRemove: memberIds.filter((id) => !selectedSet.has(id)),
        });
      } else {
        // The API already accepted students on create; the old form never sent them
        await api.post(ENDPOINT.batches, { name: name.trim(), fee: feeNumber, userIds: selected });
      }
      toast({ title: editMode ? "Batch updated" : "Batch created", variant: "success" });
      onSuccess?.();
      onOpenChange?.(false);
    } catch (err) {
      // Stays open so nothing is lost
      toast({
        title: editMode ? "Couldn't update the batch" : "Couldn't create the batch",
        description: (err as Error)?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={(o) => onOpenChange?.(o)}
      title={editMode ? "Edit batch" : "New batch"}
      description={editMode ? defaultBatch?.name : "Name it, set the fee and pick its students."}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="h-11" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button variant="brand" className="h-11 flex-1 gap-2" onClick={onSave} disabled={!canSave}>
            {saving && <Loader2Icon className="size-4 animate-spin" />}
            {editMode ? "Save changes" : "Create batch"}
            {selected && selected.length > 0 && <span className="opacity-80">· {selected.length}</span>}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 p-4">
        <form
          className="grid grid-cols-[1fr_8rem] gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <LabelInput
            label="Batch name"
            placeholder="e.g. JEE 2027"
            value={name}
            onChange={(e) => setName(e.target.value)}
            inputClassName="h-11 text-base sm:text-sm"
            autoComplete="off"
          />
          <LabelInput
            label="Fee (₹)"
            placeholder="0"
            inputMode="numeric"
            value={fee}
            // Digits only: "abc" or "-5" can't reach the API
            onChange={(e) => setFee(e.target.value.replace(/\D/g, ""))}
            inputClassName="h-11 text-base tabular-nums sm:text-sm"
          />
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>

        <section aria-labelledby="batch-students" className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 id="batch-students" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Students {selected ? `· ${selected.length} selected` : ""}
            </h3>
            {selected && selected.length > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-brand" onClick={() => setSelected([])}>
                Clear
              </Button>
            )}
          </div>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search students"
              placeholder="Search name or ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 pl-9 text-base sm:text-sm"
            />
          </div>

          {(usersLoading && users.length === 0) || selected === null ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading students">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {users.length ? "No students match" : "No students yet. Add them on the Users page."}
            </p>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {filtered.map((user) => {
                const id = `batch-user-${user._id}`;
                return (
                  <li key={user._id}>
                    <label htmlFor={id} className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                      <Checkbox id={id} checked={selectedSet.has(user._id)} onCheckedChange={(c) => toggle(user._id, c === true)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{user.name || "—"}</span>
                        <span className="block text-xs text-muted-foreground">
                          {user.userId}
                          {user.phone ? ` · ${user.phone}` : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </ResponsiveDrawer>
  );
};

export default AddBatchSheet;
