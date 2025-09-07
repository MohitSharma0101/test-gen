import { buttonVariants } from "@/components/ui/button";
import { TPaper } from "@/models/Paper";
import CreatePaper from "@/modules/create-paper";
import { fetchPapers } from "@/service/core.service";
import { NewspaperIcon } from "lucide-react";
import Link from "next/link";
import React from "react";

type Props = {
  params: {
    id: string;
  };
};

const EditPaperPage = async ({ params: { id } }: Props) => {
  const papers = (await fetchPapers(id)).papers;
  const paper = papers?.[0];
  return (
    <>
      <div className="px-4 py-3 text-sm flex gap-3 bg-sky-100 border border-sky-500 rounded-none text-sky-800">
        <NewspaperIcon className="w-4 h-4 mt-1 !text-sky-800" />
        <div className="flex-grow">
          <p className="font-bold text-base">{paper.title}</p>
          <span>You are editing a paper</span>
        </div>
        <div>
          <Link
            href={"/papers"}
            className={buttonVariants({ variant: "outline" })}
          >
            Go Back
          </Link>
        </div>
      </div>
      <CreatePaper mode="update" defaultPaper={paper} />
    </>
  );
};

export default EditPaperPage;
