"use client";

import AddUserSheet from "@/components/sheets/add-user-sheet";
import EditUserSheet from "@/components/sheets/edit-user-sheet";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import CallButton from "@/components/ui/call-button";
import { Input } from "@/components/ui/input";
import WAButton from "@/components/ui/wa-button";
import useUsers from "@/hooks/useUsers";
import { getDateFromISO } from "@/lib/utils";
import { TBatch } from "@/models/Batch";
import { TUser } from "@/models/User";
import { Edit2Icon } from "lucide-react";
import React, { useState } from "react";

const UserPage = () => {
  const [query, setQuery] = useState("");
  const { users, loading, refreshUsers } = useUsers();
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.userId.toLowerCase().includes(query.toLowerCase()) ||
      user.phone.toLowerCase().includes(query.toLowerCase())
  );

  const [selectedUser, setSelectedUser] = useState<TUser>();

  const columns = [
    {
      header: "Edit",
      render: (user: TUser) => (
        <Button
          variant={"outline"}
          size={"icon"}
          onClick={() => setSelectedUser(user)}
        >
          <Edit2Icon className="w-4 h-4" />
        </Button>
      ),
    },
    {
      header: "Id",
      accessor: "userId" as keyof TUser,
      className: "font-medium",
    },
    {
      header: "Name",
      accessor: "name" as keyof TUser,
      className: "min-w-[140px] font-medium",
    },
    {
      header: "Batches",
      render: (user: TUser) => (
        <div className="flex items-center gap-1">
          {(user.batchIds as TBatch[])?.map((batch) => (
            <div
              key={batch._id}
              className="text-[10px] text-center truncate max-w-[96px] font-semibold bg-slate-300 py-1 px-2 rounded-full"
            >
              {batch?.name}
            </div>
          ))}
        </div>
      ),
      className: "min-w-[140px]",
    },
    {
      header: "Phone",
      accessor: "phone" as keyof TUser,
      className: "w-[120px] text-right",
    },
    {
      header: "DOB",
      accessor: "dob" as keyof TUser,
      className: "min-w-[110px] text-right",
    },
    {
      header: "Father Name",
      accessor: "fatherName" as keyof TUser,
      className: "min-w-[100px] text-right",
    },
    {
      header: "Mother Name",
      accessor: "motherName" as keyof TUser,
      className: "min-w-[100px] text-right",
    },
    {
      header: "Parent Phone",
      render: (user: TUser) => (
        <div className="flex items-center justify-end gap-2">
          {user.parentPhone}
          <WAButton phone={user.parentPhone} />
          <CallButton phoneNumber={user.parentPhone} />
        </div>
      ),
      className: "min-w-[120px]",
    },
    {
      header: "School",
      accessor: "school" as keyof TUser,
      className: "w-[120px] text-right truncate max-w-[400px]",
    },
    {
      header: "Email",
      accessor: "email" as keyof TUser,
      className: "w-[130px] text-right",
    },
    {
      header: "Created At",
      render: (user: TUser) => (
        <div className="w-fit text-right">
          {getDateFromISO(user.createdAt ?? "")}
        </div>
      ),
      className: "w-[140px]",
    },
    {
      header: "Updated At",
      render: (user: TUser) => (
        <div className="w-fit text-right">
          {getDateFromISO(user.updatedAt ?? "")}
        </div>
      ),
      className: "w-[140px]",
    },
  ];

  return (
    <div className="flex-1 rounded">
      <div className="rounded h-[52px] px-6 border border-slate-200 bg-slate-300 text-sm font-medium flex items-center justify-between">
        USERS
        <AddUserSheet onSuccess={refreshUsers} />
      </div>

      <div className="px-2 lg:px-6 py-3">
        <div className="py-2">
          <Input
            placeholder={"Search by name, number or Id"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <DataTable
          data={filteredUsers}
          loading={loading}
          columns={columns}
          className="mt-2"
          rowKey={(user) => user._id}
        />
      </div>
      {selectedUser && (
        <EditUserSheet
          open={!!selectedUser}
          onOpenChange={(_open) => {
            if (!_open) setSelectedUser(undefined);
          }}
          defaultUser={selectedUser}
          onSuccess={refreshUsers}
        />
      )}
    </div>
  );
};

export default UserPage;
