"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { pagesForRow, readRecentPagesCookie } from "@/lib/recentPages";

type Props = {
  // Server-rendered button per page this account may open, keyed by href
  cards: Record<string, ReactNode>;
  // Read from the cookie by the server, so the first paint is already right
  initialRecent: string[];
};

// Picks and orders the four buttons. Deliberately tiny: no icons or route
// data ship to the browser for this, only the ordering logic.
export const QuickActionsRow = ({ cards, initialRecent }: Props) => {
  const [recent, setRecent] = useState(initialRecent);

  // Next keeps a rendered Home in its client cache for a short while, so after
  // visiting a page and coming straight back the server's list can be one
  // visit behind. Re-read the cookie on mount; this only re-renders if it
  // actually changed.
  useEffect(() => {
    const latest = readRecentPagesCookie();
    if (latest.join("|") !== recent.join("|")) setRecent(latest);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);

  const { hrefs, hasHistory } = pagesForRow(recent, Object.keys(cards));

  return (
    <section aria-labelledby="quick-actions-title" className="mt-6">
      <h2 id="quick-actions-title" className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {hasHistory ? "Jump back in" : "Quick actions"}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {hrefs.map((href) => (
          // Fragment, not a wrapper: the cards must be direct grid children for
          // the first-card styling to apply
          <Fragment key={href}>{cards[href]}</Fragment>
        ))}
      </div>
    </section>
  );
};
