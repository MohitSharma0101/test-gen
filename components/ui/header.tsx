import {
  BookOpenTextIcon,
  BookTextIcon,
  FilePenLineIcon,
  FileQuestion,
  FileUpIcon,
  MenuIcon,
  NewspaperIcon,
} from "lucide-react";
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
import { Users2 } from "lucide-react";
import { GraduationCap } from "lucide-react";
import { Edit3Icon } from "lucide-react";
import { MessageCircleIcon } from "lucide-react";
import AccountMenu from "./account-menu";
import { ScrollTextIcon } from "lucide-react";
import { IndianRupeeIcon } from "lucide-react";

type Props = {
  active?: "create" | "upload" | "chapter" | "book";
};

const navItems = [
  {
    label: "Create Paper",
    href: "/",
    icon: <FilePenLineIcon className="w-5 h-5 mr-2" strokeWidth={2} />,
  },
  {
    label: "Upload Paper",
    href: "/upload",
    icon: <FileUpIcon className="w-5 h-5 mr-2" strokeWidth={2} />,
  },
  {
    label: "Chapters",
    href: "/chapters",
    icon: <BookOpenTextIcon className="w-5 h-5 mr-2" strokeWidth={2} />,
  },
  {
    label: "Books",
    href: "/books",
    icon: <BookTextIcon className="w-5 h-5 mr-2" strokeWidth={2} />,
  },
  {
    label: "Papers",
    href: "/papers",
    icon: <NewspaperIcon className="w-5 h-5 mr-2" strokeWidth={2} />,
  },
  {
    label: "Questions",
    href: "/questions",
    icon: <FileQuestion className="w-5 h-5 mr-2" strokeWidth={2} />,
  },
  {
    label: "Users",
    href: "/users",
    icon: <Users2 className="w-5 h-5 mr-2" strokeWidth={2} />,
  },
  {
    label: "Batches",
    href: "/batch",
    icon: <GraduationCap className="w-5 h-5 mr-2" strokeWidth={2} />,
  },
  {
    label: "Attendance",
    href: "/attendance",
    icon: <Edit3Icon className="w-5 h-5 mr-2" strokeWidth={2} />,
  },
  {
    label: "Send Message",
    href: "/send-message",
    icon: <MessageCircleIcon className="w-5 h-5 mr-2" strokeWidth={2} />,
  },
  {
    label: "Results",
    href: "/exam-results",
    icon: <ScrollTextIcon className="w-5 h-5 mr-2" strokeWidth={2} />,
  },
  {
    label: "Fees",
    href: "/fees",
    icon: <IndianRupeeIcon className="w-5 h-5 mr-2" strokeWidth={2} />,
  },
];

const Header = ({ active }: Props) => {
  return (
    <div className="bg-white w-full px-3 md:px-6 py-2 items-center flex gap-4 text-sm font-bold">
      <div className="flex items-center justify-center gap-2 font-bold text-xl">
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
          {navItems.map((item) => (
            <DropdownMenuItem asChild key={item.href} className="w-[180px]">
              <Link href={item.href} className="cursor-pointer py-2">
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
