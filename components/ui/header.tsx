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
import UserMenu from "./user-menu";

const Header = () => {
  return (
    <div className="bg-white w-full px-3 md:px-6 py-2 flex justify-between gap-4 text-sm font-bold">
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
      <div className="flex items-center justify-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={"outline"}>
              <MenuIcon className="w-4 h-4 mr-1" /> Menu
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end" className="p-1">
            <DropdownMenuLabel>Quick links</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={"/"} className="cursor-pointer">
                <FilePenLineIcon className="w-5 h-5 mr-2" strokeWidth={2} />
                Create Paper
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={"/upload"} className="cursor-pointer">
                <FileUpIcon className="w-5 h-5 mr-2" strokeWidth={2} />
                Upload Questions
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={"/chapters"} className="cursor-pointer">
                <BookOpenTextIcon className="w-5 h-5 mr-2" strokeWidth={2} />
                Chapters
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={"/books"} className="cursor-pointer">
                <BookTextIcon className="w-5 h-5 mr-2" strokeWidth={2} />
                Books
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={"/papers"} className="cursor-pointer">
                <NewspaperIcon className="w-5 h-5 mr-2" strokeWidth={2} />
                Papers
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={"/questions"} className="cursor-pointer">
                <FileQuestion className="w-5 h-5 mr-2" strokeWidth={2} />
                Question
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <UserMenu />
      </div>
    </div>
  );
};

export default Header;
