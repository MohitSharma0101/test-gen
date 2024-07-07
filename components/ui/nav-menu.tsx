import React from "react";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";
import { MenuIcon, PencilIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

type Props = {};

const NavMenu = (props: Props) => {
  return (
    <Sheet>
      <SheetTrigger>
        <MenuIcon className="w-5 h-5" />
      </SheetTrigger>
      <SheetContent side={"left"} className="p-4">
        <p className="text-lg border-b w-full pb-2">Menu</p>
        <nav className="py-8 flex flex-col">
          <Link
            href={"/dashboard"}
            className="p-4 hover:text-sky-400 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add Questions
          </Link>
          <Link
            href={"/"}
            className="p-4 hover:text-sky-400 flex items-center gap-2"
          >
            <PencilIcon className="w-4 h-4" />
            Create Question Paper
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default NavMenu;
