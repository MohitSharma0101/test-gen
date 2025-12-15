"use client";

import EditAccountSheet from "@/components/sheets/edit-account-sheet";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/ui/data-table";
import { useAccounts } from "@/hooks/useAccounts";
import { TAccount } from "@/models/Account";
import { Edit2Icon } from "lucide-react";
import { useState } from "react";

export default function AccountsPage() {
  const { accounts, loading, refreshAccounts } = useAccounts();
  const [selectedAccount, setSelectedAccount] = useState<TAccount>();

  return (
    <div>
      <div className="rounded py-1.5 px-2 md:px-6 border border-slate-200 bg-slate-300 flex gap-x-4 items-center justify-between flex-wrap sticky top-0 z-[10]">
        <h1 className="py-2 text-sm font-bold flex items-center gap-x-2">ACCOUNTS</h1>
      </div>
      <div className="px-2 lg:px-6 py-3">
        <DataTable
          data={accounts ?? []}
          loading={loading}
          columns={[
            {
              header: "Name",
              accessor: "name",
              className: "min-w-[140px]",
              render: (account) => account.name || account.username,
            },
            {
              header: "Username",
              accessor: "username",
              className: "min-w-[140px]",
            },
            {
              header: "Role",
              accessor: "role",
            },
            {
              header: "Edit",
              render: (account) => (
                <Button variant="outline" size="icon" onClick={() => setSelectedAccount(account)}>
                  <Edit2Icon className="w-4 h-4" />
                </Button>
              ),
            },
          ]}
          className="mt-2"
          rowKey={(account) => account._id}
        />
      </div>
      {selectedAccount && (
        <EditAccountSheet
          open={!!selectedAccount}
          onOpenChange={() => setSelectedAccount(undefined)}
          defaultAccount={selectedAccount}
          onSave={() => {
            refreshAccounts();
            setSelectedAccount(undefined);
          }}
        />
      )}
    </div>
  );
}
