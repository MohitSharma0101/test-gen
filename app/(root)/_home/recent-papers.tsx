import Link from "next/link";
import { ArrowRightIcon, FileTextIcon, PlusIcon, RotateCwIcon } from "lucide-react";
import { dbConnect } from "@/lib/dbUtils";
import Paper from "@/models/Paper";
import { PaperStatus } from "@/data/const";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { timeAgo } from "./greeting";

const LIMIT = 4;

type TRecentPaper = {
  _id: { toString(): string };
  title: string;
  questions?: unknown[];
  status?: PaperStatus;
  createdAt: Date;
};

const STATUS: Record<PaperStatus, { label: string; className: string }> = {
  [PaperStatus.PUBLIC]: { label: "Public", className: "bg-emerald-50 text-emerald-700" },
  [PaperStatus.PRIVATE]: { label: "Private", className: "bg-slate-100 text-slate-700" },
  [PaperStatus.DRAFT]: { label: "Draft", className: "bg-amber-50 text-amber-800" },
  [PaperStatus.ONLINE]: { label: "Online", className: "bg-blue-50 text-blue-700" },
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
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load your recent papers.</p>
          {/* A plain link reloads Home and retries the read */}
          <a
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <RotateCwIcon className="size-4" aria-hidden="true" />
            Try again
          </a>
        </div>
      </Section>
    );
  }

  if (papers.length === 0) {
    return (
      <Section>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <FileTextIcon className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium">No papers yet</p>
            <p className="text-sm text-muted-foreground">Papers you save will show up here.</p>
          </div>
          <Link
            href="/create-paper"
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-bold text-brand-foreground hover:bg-brand/90"
          >
            <PlusIcon className="size-4" aria-hidden="true" />
            Create a paper
          </Link>
        </div>
      </Section>
    );
  }

  const now = new Date();
  return (
    <Section>
      <ul className="-mx-2 space-y-0.5">
        {papers.map((paper, i) => {
          const status = paper.status ? STATUS[paper.status] : undefined;
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
                  <span className="block truncate text-sm font-medium">{paper.title}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      {count} {count === 1 ? "question" : "questions"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{timeAgo(paper.createdAt, now)}</span>
                  </span>
                </span>
                {status && (
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", status.className)}>
                    {status.label}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
};
