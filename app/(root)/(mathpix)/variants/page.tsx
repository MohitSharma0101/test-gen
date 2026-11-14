"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SparklesIcon } from "lucide-react";
import { VariantBatch } from "@/components/variants/variant-batch";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTE_GROUPS } from "@/data/routes";
import { useSaveTargetStore, type TSaveTarget } from "@/stores/saveTargetStore";

const TARGET_KEYS: (keyof TSaveTarget)[] = ["course", "subject", "book", "chapter", "marks", "tag"];

// Make new questions from a photo or typed question with AI. Used to be a side
// sheet on Upload; a page gives the review space. Where to save is asked for
// in a drawer at upload time and remembered, so it isn't on the page.
export default function VariantsPage() {
  const params = useSearchParams();

  // Coming from Upload, its picks become the remembered save target
  useEffect(() => {
    const fromUpload = Object.fromEntries(
      TARGET_KEYS.map((k) => [k, params.get(k)]).filter(([, v]) => v)
    ) as Partial<TSaveTarget>;
    // Replace the whole target so an old book/chapter can't linger under a new class
    if (Object.keys(fromUpload).length > 0)
      useSaveTargetStore.getState().setTarget({ book: "", chapter: "", marks: "1", tag: "", ...fromUpload });
  }, [params]);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-3 px-4 pb-12 pt-5 sm:px-6">
      <PageHeader
        icon={<SparklesIcon />}
        tone={ROUTE_GROUPS.bank.tile}
        title="Question variants"
        description="Make new questions from a photo or a typed question."
      />

      {/* No wrapping card: the tab's own blocks are the cards */}
      <VariantBatch />
    </main>
  );
}
