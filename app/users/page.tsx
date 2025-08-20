"use client";

import AddUserSheet from "@/components/sheets/add-user-sheet";
import CallButton from "@/components/ui/call-button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WAButton from "@/components/ui/wa-button";
import useUsers from "@/hooks/useUsers";
import { getDateFromISO } from "@/lib/utils";
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
        {loading ? (
          <div className="w-full flex flex-col gap-2 mt-2">
            <Skeleton className="w-full h-[60px]" />
            <Skeleton className="w-full h-[60px]" />
            <Skeleton className="w-full h-[60px]" />
            <Skeleton className="w-full h-[60px]" />
          </div>
        ) : (
          <Table className="mt-2">
            <TableHeader className="border border-slate-300 bg-slate-300">
              <TableRow className="divide-x divide-slate-300 border-b border-slate-300">
                <TableHead>Id</TableHead>
                <TableHead className="min-w-[120px]">Name</TableHead>
                <TableHead className="w-[130px] text-right">Email</TableHead>
                <TableHead className="w-[120px] text-right">Phone</TableHead>
                <TableHead className="min-w-[110px] text-right">DOB</TableHead>
                <TableHead className="min-w-[100px] text-right">
                  Father Name
                </TableHead>
                <TableHead className="min-w-[100px] text-right">
                  Mother Name
                </TableHead>
                <TableHead className="min-w-[120px] text-right">
                  Parent Phone
                </TableHead>
                <TableHead className="w-[120px] text-right">School</TableHead>
                <TableHead className="w-[140px] text-right">
                  Created At
                </TableHead>
                <TableHead className="w-[140px] text-right">
                  Updated At
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-300 border border-slate-300">
              {filteredUsers.map((user) => (
                <TableRow
                  key={user._id}
                  className="divide-x divide-slate-300 border-slate-300"
                >
                  <TableCell className="font-medium">{user.userId}</TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-right">{user.email}</TableCell>
                  <TableCell className="text-right">{user.phone}</TableCell>
                  <TableCell className="text-right">{user.dob}</TableCell>
                  <TableCell className="text-right">
                    {user.fatherName}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.motherName}
                  </TableCell>
                  <TableCell className=" h-full">
                    <div className="flex items-center justify-end gap-2">
                      {user.parentPhone}
                      <WAButton phone={user.parentPhone} />
                      <CallButton phoneNumber={user.parentPhone} />
                    </div>
                  </TableCell>
                  <TableCell className="w-[120px] text-right truncate max-w-[400px]">
                    {user.school}
                  </TableCell>
                  <TableCell className="w-fit text-right">
                    {getDateFromISO(user.createdAt ?? "")}
                  </TableCell>
                  <TableCell className="w-fit text-right">
                    {getDateFromISO(user.updatedAt ?? "")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default UserPage;
