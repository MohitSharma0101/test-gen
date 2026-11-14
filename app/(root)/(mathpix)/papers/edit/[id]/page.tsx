import { buttonVariants } from "@/components/ui/button";
import { TPaper } from "@/models/Paper";
import CreatePaper from "@/modules/create-paper";
import { dbConnect } from "@/lib/dbUtils";
import Paper from "@/models/Paper";
import "@/models/Question";
import "@/models/Chapter";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import { NewspaperIcon } from "lucide-react";
import Link from "next/link";
import React from "react";

type Props = {
  params: {
    id: string;
  };
};

const EditPaperPage = async ({ params: { id } }: Props) => {
  // Read the paper straight from the database. This used to go through the
  // axios client, whose base URL is the relative "/api": fine in a browser,
  // but on the server there is no host to resolve it against, so every visit
  // to this page threw.
  if (!isValidObjectId(id)) notFound();
  await dbConnect();
  const doc = await Paper.findById(id)
    .populate({ path: "questions", populate: { path: "chapter", model: "Chapter" } })
    .lean();
  if (!doc) notFound();
  // Plain JSON for the client component (ObjectIds and Dates aren't props)
  const paper = JSON.parse(JSON.stringify(doc)) as TPaper;
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
