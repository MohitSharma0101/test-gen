import { cn } from "@/lib/utils";
import { BookTextIcon, FilePenLineIcon, FileUpIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

type Props = {
  active: "create" | "upload" | "chapter" | "book";
};

const Header = ({ active }: Props) => {
  return (
    <div className="bg-white flex justify-between gap-4 text-sm font-bold">
      <Image
        src={"/education-plus-logo.png"}
        alt="education plus log"
        width={100}
        height={22}
        className="w-[50px] object-contain aspect-square -mt-2 ml-6"
      />
      <div className="flex">
      <Link
          href={"/chapters"}
          className={cn("py-2 px-7", active === "chapter" && "bg-gray-100")}
        >
          <BookTextIcon className="w-5 h-5 mb-2 mx-auto" strokeWidth={2}/>
          Chapters
        </Link>
        <Link
          href={"/"}
          className={cn("py-2 px-7", active === "create" && "bg-gray-100")}
        >
          <FilePenLineIcon className="w-5 h-5 mb-2 mx-auto" strokeWidth={2}/>
          Create
        </Link>
        <Link
          href={"/upload"}
          className={cn("py-2 px-7", active === "upload" && "bg-gray-100")}
        >
          <FileUpIcon className="w-5 h-5 mb-2 mx-auto" strokeWidth={2}/>
          Upload
        </Link>
      </div>
    </div>
  );
};

export default Header;
