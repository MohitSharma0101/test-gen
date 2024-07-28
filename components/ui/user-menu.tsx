"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { useAuth } from "@/context/auth-context";
import { LogOutIcon } from "lucide-react";

type Props = {};

const UserMenu = (props: Props) => {
  const { user, logout } = useAuth();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-primary w-10 h-10 rounded-full bg-slate-400 flex items-center justify-center text-white">
        {user?.name.slice(0, 1)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="mx-2 p-2 min-w-[160px]">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          className="focus:bg-red-400 hover:bg-red-400 focus:text-white"
        >
          <LogOutIcon className="w-4 h-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
