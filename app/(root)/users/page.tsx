"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2Icon, PencilIcon, PhoneIcon, PlusIcon, ScanFaceIcon, SearchIcon, SearchXIcon, Users2Icon, XIcon } from "lucide-react";
import AddUserSheet from "@/components/sheets/add-user-sheet";
import EditUserSheet from "@/components/sheets/edit-user-sheet";
import EnrollFaceSheet from "@/components/sheets/enroll-face-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import WAButton from "@/components/ui/wa-button";
import SelectCompact from "@/components/ui/select-compact";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/state-message";
import { ResponsiveList, type ListColumn } from "@/components/ui/responsive-list";
import { ROUTE_GROUPS } from "@/data/routes";
import useUsers from "@/hooks/useUsers";
import useBatches from "@/hooks/useBatches";
import { cn, getDateFromISO } from "@/lib/utils";
import { TBatch } from "@/models/Batch";
import { TUser } from "@/models/User";

const TONE = ROUTE_GROUPS.institute.tile;

// Below this, matching accuracy drops sharply, so a thin enrollment is shown
// as "Weak" rather than passing as done. Kept in step with the API route.
const MIN_SIGNATURES = 5;
// Rendered in steps: a few hundred rows at once made the page sluggish
const PAGE_SIZE = 50;

type TFaceState = "none" | "weak" | "ok";
const faceState = (u: TUser): TFaceState => {
  const count = u.faceSignatureCount ?? 0;
  return !count ? "none" : count < MIN_SIGNATURES ? "weak" : "ok";
};

const FACE_STYLES: Record<TFaceState, string> = {
  none: "border-border bg-muted text-muted-foreground hover:bg-muted/70",
  weak: "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
  ok: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
};

const NO_BATCH = "__none";

const batchesOf = (u: TUser) => ((u.batchIds ?? []) as TBatch[]).filter((b) => b && typeof b === "object");

const FaceButton = ({ user, onClick }: { user: TUser; onClick: () => void }) => {
  const count = user.faceSignatureCount ?? 0;
  const state = faceState(user);
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        count
          ? `${count} signature${count === 1 ? "" : "s"}${user.faceEnrolledAt ? ` · enrolled ${getDateFromISO(user.faceEnrolledAt)}` : ""}`
          : "Not enrolled — tap to enroll"
      }
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        FACE_STYLES[state]
      )}
    >
      {state === "ok" ? <CheckCircle2Icon className="size-3.5" /> : <ScanFaceIcon className="size-3.5" />}
      {state === "none" ? "Not enrolled" : state === "weak" ? `Weak · ${count}` : `Enrolled · ${count}`}
    </button>
  );
};

const BatchChips = ({ user }: { user: TUser }) => {
  const list = batchesOf(user);
  if (!list.length) return <span className="text-xs text-muted-foreground">No batch</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {list.map((batch) => (
        <span key={batch._id} className="max-w-[9rem] truncate rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">
          {batch.name}
        </span>
      ))}
    </span>
  );
};

// Parent number with WhatsApp and Call kept apart, Call labelled: an icon pair was easy to mis-tap
const ParentContact = ({ user }: { user: TUser }) => (
  <div className="flex items-center gap-3">
    <span className="min-w-0 flex-1">
      {user.parentPhone ? (
        <span className="block text-sm tabular-nums">{user.parentPhone}</span>
      ) : (
        <span className="block text-xs font-medium text-amber-700">No parent phone</span>
      )}
      {user.fatherName && <span className="block truncate text-xs text-muted-foreground">{user.fatherName}</span>}
    </span>
    {user.parentPhone && (
      <>
        <WAButton
          phone={user.parentPhone}
          label={`WhatsApp ${user.fatherName || "parent"}`}
          className="size-10 shrink-0 rounded-full hover:bg-emerald-50"
        />
        <a
          href={`tel:${user.parentPhone}`}
          className={cn(buttonVariants({ variant: "outline" }), "h-10 shrink-0 gap-1.5 px-3 text-brand")}
        >
          <PhoneIcon className="size-4" aria-hidden="true" /> Call
        </a>
      </>
    )}
  </div>
);

const UserPage = () => {
  const { users, loading, refreshUsers } = useUsers();
  const { batches } = useBatches();
  const [query, setQuery] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [faceFilter, setFaceFilter] = useState("");
  const [sort, setSort] = useState("name");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selectedUser, setSelectedUser] = useState<TUser>();
  const [faceUser, setFaceUser] = useState<TUser>();

  const filtersOn = Boolean(query || batchFilter || faceFilter);
  const clearFilters = () => {
    setQuery("");
    setBatchFilter("");
    setFaceFilter("");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Any field may be missing on an older record: never call methods on it unchecked
    const has = (v?: string) => (v ?? "").toLowerCase().includes(q);
    const list = users.filter(
      (u) =>
        (!q || has(u.name) || has(u.userId) || has(u.phone) || has(u.parentPhone) || has(u.fatherName)) &&
        (!batchFilter ||
          (batchFilter === NO_BATCH ? batchesOf(u).length === 0 : batchesOf(u).some((b) => b._id === batchFilter))) &&
        (!faceFilter || faceState(u) === faceFilter)
    );
    if (sort === "newest") return [...list].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    if (sort === "id") return [...list].sort((a, b) => (a.userId ?? "").localeCompare(b.userId ?? "", undefined, { numeric: true }));
    return list; // the API already returns them by name
  }, [users, query, batchFilter, faceFilter, sort]);

  const shown = filtered.slice(0, limit);

  const columns: ListColumn<TUser>[] = [
    {
      header: "Student",
      cell: (u) => (
        <>
          <span className="block truncate font-medium">{u.name || "—"}</span>
          <span className="text-xs text-muted-foreground">
            {u.userId}
            {u.phone ? ` · ${u.phone}` : ""}
          </span>
        </>
      ),
    },
    { header: "Batches", width: "w-48", cell: (u) => <BatchChips user={u} /> },
    {
      header: "Parent",
      width: "w-80",
      cell: (u) => (
        <ParentContact user={u} />
      ),
    },
    { header: "Face", width: "w-36", cell: (u) => <FaceButton user={u} onClick={() => setFaceUser(u)} /> },
    {
      header: "Edit",
      srOnlyHeader: true,
      width: "w-14",
      cell: (u) => (
        <Button variant="ghost" onClick={() => setSelectedUser(u)} aria-label={`Edit ${u.name}`} className="size-8 p-0">
          <PencilIcon className="size-4" />
        </Button>
      ),
    },
  ];

  const card = (u: TUser) => (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <button type="button" onClick={() => setSelectedUser(u)} className="min-w-0 flex-1 text-left">
          <span className="block truncate font-bold">{u.name || "—"}</span>
          <span className="block text-xs text-muted-foreground">
            {u.userId}
            {u.phone ? ` · ${u.phone}` : ""}
          </span>
        </button>
        {/* Own row so the pill and the 36px edit button share a centre line */}
        <div className="flex shrink-0 items-center gap-1">
          <FaceButton user={u} onClick={() => setFaceUser(u)} />
          <Button variant="ghost" onClick={() => setSelectedUser(u)} aria-label={`Edit ${u.name}`} className="size-9 shrink-0 p-0">
            <PencilIcon className="size-4" />
          </Button>
        </div>
      </div>
      <div className="mt-2">
        <BatchChips user={u} />
      </div>
      <div className="mt-2 border-t pt-2">
        <ParentContact user={u} />
      </div>
    </div>
  );

  const content = () => {
    if (loading && users.length === 0) {
      return (
        <div className="space-y-2" aria-busy="true" aria-label="Loading students">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      );
    }
    if (users.length === 0) {
      return (
        <EmptyState
          className="rounded-2xl border bg-card py-12"
          tone={TONE}
          icon={<Users2Icon />}
          title="No students yet"
          description="Add students one by one or upload a CSV."
        />
      );
    }
    if (filtered.length === 0) {
      return (
        <EmptyState
          className="rounded-2xl border bg-card py-12"
          tone={TONE}
          icon={<SearchXIcon />}
          title="No students match"
          description="Try another name or remove a filter."
          action={
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      );
    }
    return (
      <>
        <ResponsiveList rows={shown} rowKey={(u) => u._id} columns={columns} renderCard={card} busy={loading} />
        {filtered.length > shown.length && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
              Show more ({filtered.length - shown.length} left)
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 pb-12 pt-5 sm:px-6">
      <PageHeader
        icon={<Users2Icon />}
        tone={TONE}
        title="Users"
        description={
          users.length
            ? filtersOn
              ? `Showing ${filtered.length} of ${users.length}`
              : `${users.length} student${users.length === 1 ? "" : "s"}`
            : "Students and their details"
        }
        actions={
          <AddUserSheet onSuccess={refreshUsers}>
            <Button variant="brand" className="h-10 gap-2">
              <PlusIcon className="size-4" />
              <span className="hidden sm:inline">Add student</span>
              <span className="sr-only sm:hidden">Add student</span>
            </Button>
          </AddUserSheet>
        }
      />

      <div className="space-y-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search name, ID, phone or father's name"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            className="h-11 pl-9 text-base sm:text-sm"
            aria-label="Search students"
          />
        </div>
        {/* One row of filters; scrolls sideways on narrow phones */}
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 py-1 scrollbar-hide sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <SelectCompact
            placeholder="All batches"
            aria-label="Batch"
            options={[{ label: "No batch", value: NO_BATCH }, ...batches.map((b) => ({ label: b.name, value: b._id }))]}
            value={batchFilter}
            onChange={(v) => {
              setBatchFilter(v);
              setLimit(PAGE_SIZE);
            }}
            canUnselect
            className="w-40 shrink-0 sm:w-48"
          />
          <SelectCompact
            placeholder="Face: any"
            options={[
              { label: "Face: enrolled", value: "ok" },
              { label: "Face: weak", value: "weak" },
              { label: "Face: not enrolled", value: "none" },
            ]}
            value={faceFilter}
            onChange={setFaceFilter}
            canUnselect
            className="w-40 shrink-0"
          />
          <SelectCompact
            placeholder="Sort"
            options={[
              { label: "Sort: name", value: "name" },
              { label: "Sort: newest", value: "newest" },
              { label: "Sort: ID", value: "id" },
            ]}
            value={sort}
            onChange={(v) => setSort(v || "name")}
            className="w-36 shrink-0"
          />
          {filtersOn && (
            <Button variant="ghost" onClick={clearFilters} className="h-9 shrink-0 gap-1 px-2 text-brand">
              <XIcon className="size-4" /> Clear
            </Button>
          )}
        </div>
      </div>

      {content()}

      {selectedUser && (
        <EditUserSheet
          open={Boolean(selectedUser)}
          onOpenChange={(open) => {
            if (!open) setSelectedUser(undefined);
          }}
          defaultUser={selectedUser}
          onSuccess={refreshUsers}
        />
      )}
      {faceUser && (
        <EnrollFaceSheet
          open={Boolean(faceUser)}
          onOpenChange={(open) => {
            if (!open) setFaceUser(undefined);
          }}
          user={faceUser}
          onSuccess={refreshUsers}
        />
      )}
    </main>
  );
};

export default UserPage;
