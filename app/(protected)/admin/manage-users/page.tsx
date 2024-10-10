"use client";

import { Button } from "@/components/ui/button";
import { Edit2Icon, PlusIcon, RefreshCcw } from "lucide-react";
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDateFromISO } from "@/lib/utils";
import useUsers from "@/hooks/useUsers";
import DeleteButton from "@/components/ui/delete-button";
import AddUserDialog from "@/components/dailogs/AddUserDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TUserRole } from "@/models/UserRole";
import { useAuth } from "@/context/auth-context";

type Props = {};

const AdminPage = (props: Props) => {
  const { user: currentUser } = useAuth();
  const { users, loading, deleteUser, refresh, updateUser, addUser } =
    useUsers();
  const sortedUsers = users?.toSorted((a, b) =>
    a._id === currentUser?._id ? -1 : 1
  );
  return (
    <div className="p-6">
      <div className="flex-1 rounded">
        <div className="rounded h-[52px] px-4 border border-slate-200 bg-slate-300 text-sm font-medium flex items-center">
          USERS
          <AddUserDialog onSubmit={addUser}>
            <Button className="ml-auto mr-2" variant={"outline"} size={"sm"}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </AddUserDialog>
          <Button variant={"outline"} size={"sm"} onClick={() => refresh()}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        {loading ? (
          <div className="w-full flex flex-col gap-2 mt-4">
            <Skeleton className="w-full h-[60px]" />
            <Skeleton className="w-full h-[60px]" />
            <Skeleton className="w-full h-[60px]" />
            <Skeleton className="w-full h-[60px]" />
          </div>
        ) : (
          <Table className="mt-4">
            <TableHeader className="border border-slate-300">
              <TableRow className="divide-x divide-slate-300 border-b border-slate-300">
                <TableHead className="min-w-[200px]">Name</TableHead>
                <TableHead className="w-[150px] text-right">Role</TableHead>
                <TableHead className="w-[150px] text-right">Email</TableHead>
                <TableHead className="w-[150px] text-right">
                  Created At
                </TableHead>
                <TableHead className="w-[150px] text-right">
                  Last Updated At
                </TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-300 border border-slate-300">
              {sortedUsers?.map((user) => (
                <TableRow
                  key={user.email}
                  className="divide-x divide-slate-300 border-slate-300"
                >
                  <TableCell className="font-medium  flex items-center gap-4">
                    <p className="w-[100px] md:w-fit">{user.name}</p>
                    {user._id === currentUser?._id && (
                      <Badge className="bg-slate-400">Current</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge>{user.role.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{user.email}</TableCell>
                  <TableCell className="text-right">
                    {getDateFromISO(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {getDateFromISO(user.updatedAt)}
                  </TableCell>
                  <TableCell className="text-center flex items-center justify-center gap-2">
                    {user._id === currentUser?._id ? "-": (
                      <>
                        <AddUserDialog
                          onSubmit={(values) => {
                            updateUser({
                              id: user._id,
                              name: values.name,
                              email: values.email,
                              role: values.role as TUserRole,
                            });
                          }}
                          user={user}
                        >
                          <Button variant={"outline"} size={"icon"}>
                            <Edit2Icon className="w-4 h-4" />
                          </Button>
                        </AddUserDialog>
                        <DeleteButton
                          onDelete={() =>
                            user._id && deleteUser(user._id.toString())
                          }
                        />
                      </>
                    )}
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

export default AdminPage;
