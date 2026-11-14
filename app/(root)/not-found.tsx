import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileQuestionIcon, HomeIcon } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <FileQuestionIcon className="size-7" aria-hidden="true" />
      </span>
      <div>
        <h1 className="text-xl font-bold">We couldn&apos;t find that</h1>
        <p className="mt-1 text-sm text-muted-foreground">It may have been deleted, or the link is wrong.</p>
      </div>
      <Link href="/" className={cn(buttonVariants({ variant: "brand" }), "gap-1.5")}>
        <HomeIcon className="size-4" aria-hidden="true" />
        Back to Home
      </Link>
    </main>
  );
}
