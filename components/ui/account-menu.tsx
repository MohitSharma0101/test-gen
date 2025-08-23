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
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

const AccountMenu = ({ className }: Props) => {
  const { account, logout } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "outline-primary w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center text-white",
          className
        )}
      >
        {account?.username?.slice(0, 1).toUpperCase() ?? "?"}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="mx-2 p-2 min-w-[160px]">
        <DropdownMenuLabel>
          {account?.username || "My Account"}
        </DropdownMenuLabel>
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

export default AccountMenu;
