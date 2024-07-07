import { cn } from "@/lib/utils";
import { FilePenLineIcon, FileUpIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

type Props = {
  active: "create" | "upload";
};

const Header = ({ active }: Props) => {
  return (
    <div className="bg-white flex px-12 justify-between gap-4 text-sm font-bold">
      <Image
        src={"/education-plus-logo.png"}
        alt="education plus log"
        width={100}
        height={22}
        className="w-[50px] object-contain aspect-square -mt-2"
      />
      <div className="flex">
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
