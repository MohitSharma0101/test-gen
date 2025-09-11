"use client";

import { MenuIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./button";
import AccountMenu from "./account-menu";
import { ROUTES } from "@/data/routes";

type Props = {
  active?: "create" | "upload" | "chapter" | "book";
};

const Header = ({ active }: Props) => {
  return (
    <div className="bg-white w-full px-3 md:px-6 py-2 items-center flex gap-4 text-sm font-bold">
      <div
        onClick={() => window.location.reload()}
        className="flex items-center justify-center gap-2 font-bold text-xl cursor-pointer"
      >
        <Image
          src={"/eplus-logo-min.png"}
          alt="education plus log"
          width={50}
          height={50}
          className="w-[50px] object-contain aspect-square -mt-2"
        />
        <div className="flex flex-col leading-4">
          Education+
          <span className="text-sky-500 text-[10px] font-medium">
            Believe in Results
          </span>
        </div>
      </div>
      <AccountMenu className="ml-auto" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={"outline"}>
            <MenuIcon className="w-4 h-4 mr-1" /> Menu
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" className="p-1">
          <DropdownMenuLabel>Quick links</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ROUTES.map((item) => (
            <DropdownMenuItem asChild key={item.href} className="w-[180px]">
              <Link href={item.href} className="cursor-pointer py-2 flex items-center gap-2">
                {item.icon}
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default Header;
