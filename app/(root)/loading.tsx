import { Skeleton } from "@/components/ui/skeleton";

// Shown the instant a link is tapped, for every page under (root). Pages here
// are rendered on the server per request, so without a loading boundary Next
// could not prefetch anything and a tap did nothing visible until the server
// answered - seconds after an idle spell, while the function cold-starts.
// With it, <Link> prefetches this shell and the page swaps in when ready.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 pb-12 pt-5 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-40 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </main>
  );
}
