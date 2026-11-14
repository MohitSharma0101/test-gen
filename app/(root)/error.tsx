"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangleIcon, HomeIcon, RotateCwIcon } from "lucide-react";

// Any uncaught error on a signed-in page lands here instead of a blank or
// broken screen. The header stays, so the person can always get away.
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
        <AlertTriangleIcon className="size-7" aria-hidden="true" />
      </span>
      <div>
        <h1 className="text-xl font-bold">Something went wrong on this page</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your other work is safe. Try again, or go back to Home.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="brand" onClick={reset} className="gap-1.5">
          <RotateCwIcon className="size-4" aria-hidden="true" />
          Try again
        </Button>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
          <HomeIcon className="size-4" aria-hidden="true" />
          Home
        </Link>
      </div>
    </main>
  );
}
