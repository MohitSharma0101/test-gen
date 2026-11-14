"use client";

import React, { useState } from "react";
import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon, SearchIcon, UsersIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import { ResponsiveDrawer } from "../ui/responsive-drawer";
import { EmptyState } from "../ui/state-message";
import DeleteButton from "../ui/delete-button";
import { TBatch } from "@/models/Batch";
import useUsers from "@/hooks/useUsers";
import { formatINR } from "@/lib/utils";

type Props = {
  batch?: TBatch;
  onEdit?: () => void;
  onArchive?: () => void | Promise<void>;
  onUnarchive?: () => void | Promise<void>;
  isArchived?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const Phone = ({ label, phone }: { label: string; phone?: string }) =>
  phone ? (
    <a href={`tel:${phone}`} className="tabular-nums text-brand underline-offset-2 hover:underline">
      {label} {phone}
    </a>
  ) : null;

// Batch details: fee, its students (searchable, numbers tap to call), edit / archive
const ViewBatchSheet = ({ batch, onEdit, onArchive, onUnarchive, isArchived, open = false, onOpenChange }: Props) => {
  const { users, loading } = useUsers({ batchId: batch?._id, shouldLoad: Boolean(batch?._id) });
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = (users ?? []).filter(
    (u) => !q || (u.name ?? "").toLowerCase().includes(q) || (u.userId ?? "").toLowerCase().includes(q)
  );

  const footer = isArchived ? (
    <DeleteButton
      className="h-11 w-full gap-2"
      size="default"
      variant="brand"
      title="Restore batch"
      description={`Restore "${batch?.name}" to the active batch list?`}
      confirmText="Restore"
      confirmVariant="brand"
      confirmIcon={<ArchiveRestoreIcon className="mr-2 size-4" />}
      onDelete={(closeDialog) => {
        closeDialog();
        onUnarchive?.();
      }}
    >
      <ArchiveRestoreIcon className="size-4" /> Restore batch
    </DeleteButton>
  ) : (
    <div className="flex gap-2">
      {onArchive && (
        <DeleteButton
          className="h-11 gap-2"
          size="default"
          variant="outline"
          title="Archive batch"
          description={`Archive "${batch?.name}"? It will be hidden from batch lists; students keep their assignment.`}
          confirmText="Archive"
          confirmVariant="brand"
          confirmIcon={<ArchiveIcon className="mr-2 size-4" />}
          onDelete={(closeDialog) => {
            closeDialog();
            onArchive();
          }}
        >
          <ArchiveIcon className="size-4" /> Archive
        </DeleteButton>
      )}
      {onEdit && (
        <Button variant="brand" className="h-11 flex-1 gap-2" onClick={onEdit}>
          <PencilIcon className="size-4" /> Edit batch
        </Button>
      )}
    </div>
  );

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={(o) => onOpenChange?.(o)}
      title={batch?.name || "Batch"}
      description={`${loading ? "…" : users.length} student${users.length === 1 ? "" : "s"} · Fee ${formatINR(batch?.fee)}${isArchived ? " · Archived" : ""}`}
      footer={footer}
    >
      <div className="space-y-3 p-4">
        {users.length > 6 && (
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search students in batch"
              placeholder="Search name or ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 pl-9 text-base sm:text-sm"
            />
          </div>
        )}

        {loading && users.length === 0 ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading students">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            className="py-8"
            icon={<UsersIcon />}
            title={users.length ? "No students match" : "No students in this batch"}
            description={users.length || isArchived ? undefined : "Use Edit batch to add students."}
          />
        ) : (
          <ol className="divide-y rounded-xl border bg-card">
            {filtered.map((user, index) => (
              <li key={user._id} className="flex items-start gap-3 px-3 py-2.5">
                <span className="w-6 shrink-0 pt-0.5 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {user.name || "—"} <span className="font-normal text-muted-foreground">· {user.userId}</span>
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs">
                    <Phone label="Student" phone={user.phone} />
                    <Phone label="Parent" phone={user.parentPhone} />
                    {!user.phone && !user.parentPhone && <span className="text-muted-foreground">No phone saved</span>}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </ResponsiveDrawer>
  );
};

export default ViewBatchSheet;
