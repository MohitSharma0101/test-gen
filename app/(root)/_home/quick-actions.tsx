import Link from "next/link";
import { ROUTE_GROUPS, type TRoute } from "@/data/routes";
import { cn } from "@/lib/utils";

// Verb labels read better on big buttons than page names
const ACTION_LABELS: Record<string, string> = {
  "/create-paper": "Create paper",
  "/generate-paper": "Generate paper",
  "/attendance": "Take attendance",
  "/send-message": "Send message",
};

// Server-rendered button for one page. The first button in the row is the
// brand-filled one; that comes from CSS (first: / group-first:) rather than a
// prop, so the client can reorder these elements without re-rendering them.
export const QuickActionCard = ({ route }: { route: TRoute }) => (
  <Link
    href={route.href}
    className={cn(
      "group flex min-h-[4.5rem] items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-[transform,box-shadow,background-color,border-color] hover:border-brand/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-[0.98] motion-safe:hover:-translate-y-0.5 sm:flex-col sm:items-start sm:gap-4 sm:p-4",
      "first:border-transparent first:bg-brand first:text-brand-foreground"
    )}
  >
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl group-first:bg-white/15 group-first:text-brand-foreground",
        ROUTE_GROUPS[route.group].tile
      )}
    >
      <route.Icon className="size-5" strokeWidth={2} aria-hidden="true" />
    </span>
    <span className="text-sm font-bold leading-tight sm:text-base">{ACTION_LABELS[route.href] ?? route.label}</span>
  </Link>
);
