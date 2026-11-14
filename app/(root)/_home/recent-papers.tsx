import Link from "next/link";
import { ArrowRightIcon, FileTextIcon, PlusIcon } from "lucide-react";
import { dbConnect } from "@/lib/dbUtils";
import Paper from "@/models/Paper";
import { PaperStatus } from "@/data/const";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/state-message";
import { PaperStatusBadge } from "@/components/ui/paper-status-badge";
import { ROUTE_GROUPS } from "@/data/routes";
import { timeAgo } from "./greeting";

const LIMIT = 4;

type TRecentPaper = {
  _id: { toString(): string };
  title: string;
  questions?: unknown[];
  status?: PaperStatus;
  createdAt: Date;
};

const Section = ({ children }: { children: React.ReactNode }) => (
  <section aria-labelledby="recent-papers" className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 id="recent-papers" className="text-base font-bold">
        Recent papers
      </h2>
      <Link
        href="/papers"
        className="group -mr-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        All papers
        <ArrowRightIcon className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </div>
    {children}
  </section>
);

export const RecentPapersSkeleton = () => (
  <Section>
    <ul className="space-y-1" aria-busy="true" aria-label="Loading recent papers">
      {Array.from({ length: LIMIT }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-2 py-2.5">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  </Section>
);

// Server component: reads the newest papers straight from the database, so
// Home needs no client fetch and no extra API hop. Wrapped in <Suspense> by
// the page, so the rest of Home paints without waiting for it.
export const RecentPapers = async ({ author }: { author?: string }) => {
  let papers: TRecentPaper[];
  try {
    await dbConnect();
    papers = (await Paper.find(author ? { author } : {})
      .sort({ createdAt: -1, _id: -1 })
      .limit(LIMIT)
      // only what a row shows; questions are ids, used for the count
      .select("title questions status createdAt")
      .lean()) as unknown as TRecentPaper[];
  } catch {
    return (
      <Section>
        {/* A plain link reloads Home and retries the read (server component) */}
        <ErrorState message="Couldn't load your recent papers." retryHref="/" className="py-6" />
      </Section>
    );
  }

  if (papers.length === 0) {
    return (
      <Section>
        <EmptyState
          className="py-6"
          tone={ROUTE_GROUPS.papers.tile}
          icon={<FileTextIcon />}
          title="No papers yet"
          description="Papers you save will show up here."
          action={
            <Link href="/create-paper" className={cn(buttonVariants({ variant: "brand", size: "sm" }), "gap-1.5")}>
              <PlusIcon className="size-4" aria-hidden="true" />
              Create a paper
            </Link>
          }
        />
      </Section>
    );
  }

  const now = new Date();
  return (
    <Section>
      <ul className="-mx-2 space-y-0.5">
        {papers.map((paper, i) => {
          const count = paper.questions?.length ?? 0;
          return (
            <li
              key={paper._id.toString()}
              className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <Link
                href={`/papers/edit/${paper._id.toString()}`}
                className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                  <FileTextIcon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{paper.title || "Untitled paper"}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      {count} {count === 1 ? "question" : "questions"}
                    </span>
                    {paper.createdAt && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{timeAgo(paper.createdAt, now)}</span>
                      </>
                    )}
                  </span>
                </span>
                {paper.status && <PaperStatusBadge status={paper.status} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
};
