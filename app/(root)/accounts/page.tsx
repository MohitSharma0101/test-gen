"use client";

import { useMemo, useState } from "react";
import { PencilIcon, SearchIcon, SearchXIcon, UserCogIcon } from "lucide-react";
import EditAccountSheet from "@/components/sheets/edit-account-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ListColumn, ResponsiveList } from "@/components/ui/responsive-list";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state-message";
import { Role } from "@/data/const";
import { ROUTE_GROUPS } from "@/data/routes";
import { useAccounts } from "@/hooks/useAccounts";
import { TAccount } from "@/models/Account";
import { cn, courseLabel } from "@/lib/utils";

const TONE = ROUTE_GROUPS.institute.tile;

const RoleBadge = ({ role }: { role?: Role }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
      role === Role.ADMIN ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground"
    )}
  >
    {role || "—"}
  </span>
);

// "JEE: Physics, Chemistry" per class; none saved = everything
const Courses = ({ account }: { account: TAccount }) => {
  const list = (account.courses ?? []).filter((c) => c?.subjects?.length);
  if (!list.length) return <span className="text-xs text-muted-foreground">All classes and subjects</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {list.map((c) => (
        <span key={c.course} className="rounded-md border bg-background px-1.5 py-0.5 text-xs">
          <span className="font-semibold">{courseLabel(c.course)}</span>: {c.subjects.join(", ")}
        </span>
      ))}
    </span>
  );
};

export default function AccountsPage() {
  const { accounts, loading, error, refreshAccounts } = useAccounts();
  const [selectedAccount, setSelectedAccount] = useState<TAccount>();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? accounts.filter((a) => (a.name ?? "").toLowerCase().includes(q) || (a.username ?? "").toLowerCase().includes(q))
      : accounts;
  }, [accounts, query]);

  const admins = accounts.filter((a) => a.role === Role.ADMIN).length;

  const columns: ListColumn<TAccount>[] = [
    {
      header: "Name",
      cell: (a) => (
        <>
          <span className="block truncate font-medium">{a.name || a.username}</span>
          <span className="block truncate text-xs text-muted-foreground">@{a.username}</span>
        </>
      ),
    },
    { header: "Role", width: "w-28", cell: (a) => <RoleBadge role={a.role} /> },
    { header: "Classes & subjects", width: "w-[45%]", cell: (a) => <Courses account={a} /> },
    {
      header: "Edit",
      srOnlyHeader: true,
      width: "w-14",
      cell: (a) => (
        <Button variant="ghost" className="size-9 p-0" aria-label={`Edit ${a.name || a.username}`} onClick={() => setSelectedAccount(a)}>
          <PencilIcon className="size-4" />
        </Button>
      ),
    },
  ];

  const card = (a: TAccount) => (
    <button
      type="button"
      onClick={() => setSelectedAccount(a)}
      className="block w-full rounded-xl border bg-card p-3 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <span className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{a.name || a.username}</span>
          <span className="block truncate text-xs text-muted-foreground">@{a.username}</span>
        </span>
        <RoleBadge role={a.role} />
        <PencilIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </span>
      <span className="mt-2 block">
        <Courses account={a} />
      </span>
    </button>
  );

  const content = () => {
    if (loading && accounts.length === 0) {
      return (
        <div className="space-y-2" aria-busy="true" aria-label="Loading accounts">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      );
    }
    if (error && accounts.length === 0) return <ErrorState message={error} onRetry={refreshAccounts} />;
    if (accounts.length === 0) {
      return <EmptyState className="rounded-2xl border bg-card py-12" tone={TONE} icon={<UserCogIcon />} title="No accounts yet" />;
    }
    if (filtered.length === 0) {
      return <EmptyState className="rounded-2xl border bg-card py-12" tone={TONE} icon={<SearchXIcon />} title="No accounts match" />;
    }
    return <ResponsiveList rows={filtered} rowKey={(a) => a._id} columns={columns} renderCard={card} busy={loading} />;
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-12 pt-5 sm:px-6">
      <PageHeader
        icon={<UserCogIcon />}
        tone={TONE}
        title="Accounts"
        description={
          accounts.length
            ? `${accounts.length} staff login${accounts.length === 1 ? "" : "s"} · ${admins} admin${admins === 1 ? "" : "s"}`
            : "Staff logins and permissions"
        }
      />
      {accounts.length > 6 && (
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search accounts"
            placeholder="Search name or username"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 bg-card pl-9 text-base sm:text-sm"
          />
        </div>
      )}
      {content()}
      {selectedAccount && (
        <EditAccountSheet
          key={selectedAccount._id}
          open={!!selectedAccount}
          onOpenChange={(o) => !o && setSelectedAccount(undefined)}
          defaultAccount={selectedAccount}
          onSave={() => {
            refreshAccounts();
            setSelectedAccount(undefined);
          }}
        />
      )}
    </main>
  );
}
