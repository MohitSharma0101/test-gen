import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRightIcon } from "lucide-react";
import { getAccount } from "@/lib/auth";
import { Role } from "@/data/const";
import { ROUTE_GROUPS, routesFor, type TRoute, type TRouteGroup } from "@/data/routes";
import { AUTHORS } from "@/models/Author";
import { cn } from "@/lib/utils";
import { greetingFor, longDate } from "./_home/greeting";
import { RecentPapers, RecentPapersSkeleton } from "./_home/recent-papers";

export const metadata: Metadata = {
  title: "Home · Education+",
};

// The jobs teachers do most, open to every role. Order = importance.
const QUICK_ACTIONS = ["/create-paper", "/generate-paper", "/attendance", "/send-message"];

const QUICK_LABELS: Record<string, string> = {
  "/create-paper": "Create paper",
  "/generate-paper": "Generate paper",
  "/attendance": "Take attendance",
  "/send-message": "Send message",
};

// Fades each block in on first paint, a little after the one before it
const reveal = "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-300";
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

const QuickAction = ({ route, primary }: { route: TRoute; primary: boolean }) => (
  <Link
    href={route.href}
    className={cn(
      "group flex min-h-[4.5rem] items-center gap-3 rounded-2xl p-3 transition-[transform,box-shadow,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-[0.98] motion-safe:hover:-translate-y-0.5 sm:flex-col sm:items-start sm:gap-4 sm:p-4",
      primary
        ? "bg-brand text-brand-foreground shadow-sm hover:shadow-md"
        : "border bg-card shadow-sm hover:border-brand/30 hover:shadow-md"
    )}
  >
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        primary ? "bg-white/15" : ROUTE_GROUPS[route.group].tile
      )}
    >
      <route.Icon className="size-5" strokeWidth={2} aria-hidden="true" />
    </span>
    <span className="text-sm font-bold leading-tight sm:text-base">{QUICK_LABELS[route.href] ?? route.label}</span>
  </Link>
);

const ToolTile = ({ route }: { route: TRoute }) => (
  <Link
    href={route.href}
    className="group flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-[transform,box-shadow,border-color] hover:border-brand/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.99] motion-safe:hover:-translate-y-0.5"
  >
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", ROUTE_GROUPS[route.group].tile)}>
      <route.Icon className="size-5" strokeWidth={2} aria-hidden="true" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold">{route.label}</span>
      <span className="block text-xs leading-snug text-muted-foreground">{route.description}</span>
    </span>
    <ChevronRightIcon
      className="size-4 shrink-0 text-muted-foreground transition-transform motion-safe:group-hover:translate-x-0.5"
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

  const quick = QUICK_ACTIONS.map((href) => routes.find((r) => r.href === href)).filter(
    (r): r is TRoute => Boolean(r)
  );
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

      <section aria-label="Quick actions" className={cn("mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4", reveal)} style={delay(60)}>
        {quick.map((route, i) => (
          <QuickAction key={route.href} route={route} primary={i === 0} />
        ))}
      </section>

      {/* min-w-0 on the columns: grid items default to min-width:auto, so a long
          paper title would widen the column instead of truncating */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3 lg:gap-6 [&>*]:min-w-0">
        {showRecentPapers && (
          <div className={cn("lg:col-start-3 lg:row-start-1", reveal)} style={delay(120)}>
            <div className="lg:sticky lg:top-6">
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
                  "grid grid-cols-1 gap-2 min-[400px]:grid-cols-2",
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
