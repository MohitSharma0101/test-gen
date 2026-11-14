"use client";

import React, { useEffect, useMemo, useState } from "react";
import { IndianRupeeIcon, PlusIcon, SearchIcon, SearchXIcon, UsersIcon } from "lucide-react";
import AddFeeSheet from "@/components/sheets/add-fee-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ListColumn, ResponsiveList } from "@/components/ui/responsive-list";
import SelectCompact from "@/components/ui/select-compact";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state-message";
import { ROUTE_GROUPS } from "@/data/routes";
import useBatches from "@/hooks/useBatches";
import useFees from "@/hooks/useFees";
import { TUserWithFeeSummary } from "@/models/User";
import { cn, formatINR } from "@/lib/utils";

const TONE = ROUTE_GROUPS.institute.tile;
const BATCH_KEY = "fees:batch";

const num = (v?: number) => (Number.isFinite(v) ? (v as number) : 0);
const feeOf = (u: TUserWithFeeSummary) => ({
  total: num(u.feeSummary?.totalFee),
  paid: num(u.feeSummary?.totalPaid),
  due: num(u.feeSummary?.due),
});

const DueBadge = ({ due }: { due: number }) =>
  due > 0 ? (
    <span className="font-bold tabular-nums text-red-700">{formatINR(due)}</span>
  ) : (
    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Paid up</span>
  );

const Stat = ({ label, value, className }: { label: string; value: string; className?: string }) => (
  <div className="rounded-xl border bg-card p-3 shadow-sm">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className={cn("mt-0.5 truncate text-lg font-bold tabular-nums", className)}>{value}</p>
  </div>
);

const FeesPage = () => {
  const { batches, loading: batchesLoading } = useBatches();
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const [query, setQuery] = useState("");
  const [show, setShow] = useState("all");
  const [selectedUser, setSelectedUser] = useState<TUserWithFeeSummary>();
  const [openSheet, setOpenSheet] = useState(false);

  const { fees, loading, error, refresh } = useFees({ batchId: selectedBatchId });
  const users = useMemo(() => fees?.users ?? [], [fees]);

  // Remember the batch: fees are usually checked for the same batch again
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BATCH_KEY);
      if (saved) setSelectedBatchId(saved);
    } catch {}
  }, []);
  const pickBatch = (id: string) => {
    setSelectedBatchId(id);
    try {
      if (id) localStorage.setItem(BATCH_KEY, id);
      else localStorage.removeItem(BATCH_KEY);
    } catch {}
  };
  // A remembered batch that no longer exists (archived/deleted) is dropped
  useEffect(() => {
    if (!batchesLoading && selectedBatchId && batches.length && !batches.some((b) => b._id === selectedBatchId)) {
      setSelectedBatchId(undefined);
    }
  }, [batches, batchesLoading, selectedBatchId]);

  const totals = useMemo(
    () =>
      users.reduce(
        (acc, u) => {
          const f = feeOf(u);
          acc.total += f.total;
          acc.paid += f.paid;
          if (f.due > 0) {
            acc.due += f.due;
            acc.dueCount += 1;
          }
          return acc;
        },
        { total: 0, paid: 0, due: 0, dueCount: 0 }
      ),
    [users]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const due = feeOf(u).due;
      return (
        (!q || (u.name ?? "").toLowerCase().includes(q) || (u.fatherName ?? "").toLowerCase().includes(q)) &&
        (show === "all" || (show === "due" ? due > 0 : due <= 0))
      );
    });
  }, [users, query, show]);

  const openPayment = (u: TUserWithFeeSummary) => {
    setSelectedUser(u);
    setOpenSheet(true);
  };

  const columns: ListColumn<TUserWithFeeSummary>[] = [
    {
      header: "Student",
      cell: (u) => (
        <>
          <span className="block truncate font-medium">{u.name || "—"}</span>
          {u.fatherName && <span className="block truncate text-xs text-muted-foreground">{u.fatherName}</span>}
        </>
      ),
    },
    { header: "Total", width: "w-32", align: "right", cell: (u) => <span className="tabular-nums">{formatINR(feeOf(u).total)}</span> },
    { header: "Paid", width: "w-32", align: "right", cell: (u) => <span className="tabular-nums">{formatINR(feeOf(u).paid)}</span> },
    { header: "Due", width: "w-32", align: "right", cell: (u) => <DueBadge due={feeOf(u).due} /> },
    {
      header: "Payment",
      srOnlyHeader: true,
      width: "w-40",
      align: "right",
      cell: (u) => (
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-brand" onClick={() => openPayment(u)}>
          <PlusIcon className="size-4" /> Payment
        </Button>
      ),
    },
  ];

  const card = (u: TUserWithFeeSummary) => {
    const f = feeOf(u);
    const pct = f.total > 0 ? Math.min(100, Math.round((f.paid / f.total) * 100)) : 100;
    return (
      <div className="rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate font-bold">{u.name || "—"}</span>
            {u.fatherName && <span className="block truncate text-xs text-muted-foreground">{u.fatherName}</span>}
          </span>
          <span className="shrink-0 text-right">
            <DueBadge due={f.due} />
            {f.due > 0 && <span className="block text-[11px] text-muted-foreground">due</span>}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            Paid {formatINR(f.paid)} of {formatINR(f.total)}
          </span>
          <Button variant="outline" className="h-10 gap-1.5 text-brand" onClick={() => openPayment(u)}>
            <PlusIcon className="size-4" /> Payment
          </Button>
        </div>
      </div>
    );
  };

  const content = () => {
    if (!selectedBatchId) {
      return (
        <EmptyState
          className="rounded-2xl border bg-card py-12"
          tone={TONE}
          icon={<IndianRupeeIcon />}
          title="Pick a batch"
          description="Its students' fees, payments and dues will show here."
        />
      );
    }
    if (error && !fees) return <ErrorState message={error} onRetry={refresh} />;
    if (!fees) {
      return (
        <div className="space-y-3" aria-busy="true" aria-label="Loading fees">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px] rounded-xl" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
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
          icon={<UsersIcon />}
          title="No students in this batch"
          description="Add students to the batch from the Batches page."
        />
      );
    }
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Total fees" value={formatINR(totals.total)} />
          <Stat label="Collected" value={formatINR(totals.paid)} className="text-emerald-700" />
          <Stat
            label={totals.dueCount ? `Due · ${totals.dueCount} student${totals.dueCount === 1 ? "" : "s"}` : "Due"}
            value={formatINR(totals.due)}
            className={totals.due > 0 ? "text-red-700" : undefined}
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            className="rounded-2xl border bg-card py-10"
            tone={TONE}
            icon={<SearchXIcon />}
            title="No students match"
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setShow("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <ResponsiveList rows={filtered} rowKey={(u) => u._id} columns={columns} renderCard={card} busy={loading} />
        )}
      </div>
    );
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-12 pt-5 sm:px-6">
      <PageHeader icon={<IndianRupeeIcon />} tone={TONE} title="Fees" description="Track fee payments by batch" />

      <div className="flex flex-wrap gap-2">
        <SelectCompact
          placeholder="Select a batch"
          options={batches.map((b) => ({ label: b.name, value: b._id }))}
          value={selectedBatchId}
          onChange={pickBatch}
          loading={batchesLoading}
          className="w-full min-w-0 sm:w-64"
        />
        {users.length > 0 && (
          <>
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Search students"
                placeholder="Search name"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 bg-card pl-9 text-base sm:text-sm"
              />
            </div>
            <SelectCompact
              placeholder="Show"
              options={[
                { label: "All students", value: "all" },
                { label: "With dues", value: "due" },
                { label: "Paid up", value: "paid" },
              ]}
              value={show}
              onChange={(v) => setShow(v || "all")}
              className="w-36 shrink-0"
            />
          </>
        )}
      </div>

      {content()}

      {openSheet && selectedUser && (
        <AddFeeSheet key={selectedUser._id} user={selectedUser} open={openSheet} onOpenChange={setOpenSheet} onSuccess={refresh} />
      )}
    </main>
  );
};

export default FeesPage;
