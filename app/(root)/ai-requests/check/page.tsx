"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeftIcon, ClipboardCheckIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CheckForm } from "@/components/ai-requests/check-form";
import { ROUTE_GROUPS } from "@/data/routes";

// Direct link to "Check answer sheets" (the same form is a tab of the
// New request drawer). ?name=&notes=&replace= carry a switched request over.
export default function CheckAnswerSheetsPage() {
  const params = useSearchParams();
  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-28 pt-4 sm:px-6">
      <Link href="/ai-requests" className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden="true" /> AI requests
      </Link>
      <PageHeader
        icon={<ClipboardCheckIcon />}
        tone={ROUTE_GROUPS.bank.tile}
        title="Check answer sheets"
        description="Add each student's answer sheet. Claude checks them tonight; you review before results are published."
      />
      <CheckForm initialName={params.get("name") ?? ""} initialNotes={params.get("notes") ?? ""} replaceId={params.get("replace") ?? undefined} />
    </main>
  );
}
