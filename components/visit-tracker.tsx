"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  RECENT_PAGES_COOKIE,
  RECENT_PAGES_MAX_AGE,
  readRecentPagesCookie,
  serializeRecentPages,
  withVisit,
} from "@/lib/recentPages";
import { ROUTES } from "@/data/routes";

// "/papers/edit/123" → Papers, "/batch/archive" → Batches. Longest match wins
// so a future "/papers-x" can't be mistaken for "/papers".
const routeForPath = (pathname: string) =>
  ROUTES.filter((r) => pathname === r.href || pathname.startsWith(r.href + "/")).sort(
    (a, b) => b.href.length - a.href.length
  )[0];

// Records each page the person opens so Home can offer them again.
// Renders nothing; mounted once in the signed-in layout.
export const VisitTracker = () => {
  const pathname = usePathname();

  useEffect(() => {
    const route = routeForPath(pathname);
    if (!route) return; // Home and unknown paths aren't recorded

    const recent = readRecentPagesCookie();
    if (recent[0] === route.href) return;

    const value = encodeURIComponent(serializeRecentPages(withVisit(recent, route.href)));
    document.cookie = `${RECENT_PAGES_COOKIE}=${value}; Max-Age=${RECENT_PAGES_MAX_AGE}; Path=/; SameSite=Lax`;
  }, [pathname]);

  return null;
};
