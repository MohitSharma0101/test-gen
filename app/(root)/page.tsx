import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { ChevronRightIcon } from "lucide-react";
import { getAccount } from "@/lib/auth";
import { Role } from "@/data/const";
import { ROUTE_GROUPS, routesFor, type TRoute, type TRouteGroup } from "@/data/routes";
import { AUTHORS } from "@/models/Author";
import { cn } from "@/lib/utils";
import { greetingFor, longDate } from "./_home/greeting";
import { RecentPapers, RecentPapersSkeleton } from "./_home/recent-papers";
import { QuickActionCard } from "./_home/quick-actions";
import { QuickActionsRow } from "./_home/quick-actions-row";
import { RECENT_PAGES_COOKIE, parseRecentPages } from "@/lib/recentPages";

export const metadata: Metadata = {
  title: "Home · Education+",
};

// Fades each block in on first paint, a little after the one before it
const reveal = "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-300";
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

// Phones get icon + name only, two per row; the one-line description and the
// arrow come back from 640px where there is room for them.
const ToolTile = ({ route }: { route: TRoute }) => (
  <Link
    href={route.href}
    className="group flex min-h-[3.5rem] items-center gap-2.5 rounded-xl border bg-card p-2.5 shadow-sm transition-[transform,box-shadow,border-color] hover:border-brand/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.99] motion-safe:hover:-translate-y-0.5 sm:gap-3 sm:p-3"
  >
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-11 sm:rounded-xl",
        ROUTE_GROUPS[route.group].tile
      )}
    >
      <route.Icon className="size-5" strokeWidth={2} aria-hidden="true" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold leading-tight">{route.label}</span>
      <span className="hidden text-xs leading-snug text-muted-foreground sm:block">{route.description}</span>
    </span>
    <ChevronRightIcon
      className="hidden size-4 shrink-0 text-muted-foreground transition-transform motion-safe:group-hover:translate-x-0.5 sm:block"
      aria-hidden="true"
    />
  </Link>
);

export default async function Home() {
  // Shared with the layout's call through React cache(): no second DB read
  const account = await getAccount();
  const isAdmin = account?.role === Role.ADMIN;
  const routes = routesFor(isAdmin);

  // Same rule as the Papers page (useAuthors/usePapers): admins see every
  // author's papers, a teacher sees their own, and a teacher who isn't a
  // known author has no paper list.
  const author = AUTHORS.find((a) => a === account?.name);
  const showRecentPapers = isAdmin || Boolean(author);

  const now = new Date();
  const firstName = (account?.name || account?.username || "").split(" ")[0];

  const recentPages = parseRecentPages(cookies().get(RECENT_PAGES_COOKIE)?.value);
  const groups = (Object.keys(ROUTE_GROUPS) as TRouteGroup[])
    .map((group) => ({ group, items: routes.filter((r) => r.group === group) }))
    .filter((g) => g.items.length > 0);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:pt-8">
      <header className={reveal}>
        <p className="text-sm font-medium text-muted-foreground">{longDate(now)}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          {greetingFor(now)}
          {firstName && <span className="capitalize">, {firstName}</span>}
        </h1>
      </header>

      <div className={reveal} style={delay(60)}>
        <QuickActionsRow
          initialRecent={recentPages}
          cards={Object.fromEntries(routes.map((r) => [r.href, <QuickActionCard key={r.href} route={r} />]))}
        />
      </div>

      {/* min-w-0 on the columns: grid items default to min-width:auto, so a long
          paper title would widen the column instead of truncating */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3 lg:gap-6 [&>*]:min-w-0">
        {showRecentPapers && (
          <div className={cn("lg:col-start-3 lg:row-start-1", reveal)} style={delay(120)}>
            <div className="lg:sticky lg:top-[calc(var(--app-header-h)+1.5rem)]">
              <Suspense fallback={<RecentPapersSkeleton />}>
                <RecentPapers author={isAdmin ? undefined : author} />
              </Suspense>
            </div>
          </div>
        )}

        <div className={cn("space-y-6", showRecentPapers ? "lg:col-span-2 lg:row-start-1" : "lg:col-span-3")}>
          {groups.map(({ group, items }, gi) => (
            <section
              key={group}
              aria-labelledby={`group-${group}`}
              className={reveal}
              style={delay(160 + gi * 60)}
            >
              <h2 id={`group-${group}`} className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {ROUTE_GROUPS[group].label}
              </h2>
              <div
                className={cn(
                  "grid grid-cols-2 gap-2",
                  showRecentPapers ? "xl:grid-cols-2" : "lg:grid-cols-3"
                )}
              >
                {items.map((route) => (
                  <ToolTile key={route.href} route={route} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
