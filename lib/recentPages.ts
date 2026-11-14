// The last pages a person opened, newest first, for the top of Home.
//
// Kept in a cookie rather than localStorage so the server can render Home with
// the right buttons on first paint (no swap after hydration). It is per device,
// holds only route paths like "/attendance", and never anything about the data
// on those pages.
export const RECENT_PAGES_COOKIE = "recent_pages";
export const RECENT_PAGES_MAX = 4;
export const RECENT_PAGES_MAX_AGE = 60 * 60 * 24 * 365; // a year, in seconds

// Shown until someone has visited enough pages to fill the row
export const DEFAULT_PAGES = ["/create-paper", "/generate-paper", "/attendance", "/send-message"];

export const parseRecentPages = (value?: string | null): string[] =>
  (value ? decodeURIComponent(value).split("|") : []).filter(Boolean);

export const serializeRecentPages = (hrefs: string[]) => hrefs.join("|");

export const withVisit = (hrefs: string[], href: string) =>
  [href, ...hrefs.filter((h) => h !== href)].slice(0, RECENT_PAGES_MAX);

// Reads the cookie in the browser without a cookie library
export const readRecentPagesCookie = () =>
  parseRecentPages(
    document.cookie
      .split("; ")
      .find((c) => c.startsWith(RECENT_PAGES_COOKIE + "="))
      ?.slice(RECENT_PAGES_COOKIE.length + 1)
  );

// What the row shows: recent pages the account may open, topped up with the
// defaults it doesn't already contain.
export const pagesForRow = (recent: string[], allowed: string[]) => {
  const ok = new Set(allowed);
  const hrefs = [...recent, ...DEFAULT_PAGES].filter((h, i, all) => ok.has(h) && all.indexOf(h) === i);
  return {
    hrefs: hrefs.slice(0, RECENT_PAGES_MAX),
    // true once at least one button comes from the person's own history
    hasHistory: recent.some((h) => ok.has(h)),
  };
};
