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
import { Role } from "@/data/const";
import { LogOutIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

const AccountMenu = ({ className }: Props) => {
  const { account, logout } = useAuth();
  const displayName = account?.name || account?.username || "My account";
  const isAdmin = account?.role === Role.ADMIN;
  const initial = (account?.name || account?.username || "?").trim().slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account: ${displayName}`}
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          className
        )}
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground">
          {initial}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={8} collisionPadding={8} className="w-64 rounded-2xl p-1.5 shadow-xl">
        <DropdownMenuLabel className="flex items-center gap-3 p-2.5 font-normal">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-base font-bold text-brand-foreground">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{displayName}</span>
            {account?.username && (
              <span className="block truncate text-xs text-muted-foreground">@{account.username}</span>
            )}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
              isAdmin ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground"
            )}
          >
            {isAdmin ? "Admin" : "Teacher"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-1" />
        <DropdownMenuItem
          onClick={logout}
          className="h-10 cursor-pointer gap-2.5 rounded-xl px-2.5 font-medium text-red-700 focus:bg-red-50 focus:text-red-700"
        >
          <LogOutIcon className="size-4" aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountMenu;
