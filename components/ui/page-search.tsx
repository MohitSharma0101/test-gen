"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ClockIcon, CornerDownLeftIcon, SearchIcon, XIcon } from "lucide-react";
import { ROUTE_GROUPS, SEARCH_EXTRAS, type TRoute } from "@/data/routes";
import { cn } from "@/lib/utils";

type TItem = { label: string; href: string; description?: string; keywords?: string; tile: string; Icon?: TRoute["Icon"] };

/* Recently opened pages, per device (a convenience: empty storage just shows suggestions) */
const RECENT_KEY = "page-search:recent";
const readRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
};
const SUGGESTIONS = ["attendance", "marks", "fees", "online test", "whatsapp"];

/** The label with the typed words in bold, so it's clear why a page matched. */
function Highlight({ text, query }: { text: string; query: string }) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return (
    <>
      {text.split(re).map((part, i) =>
        words.includes(part.toLowerCase()) ? (
          <mark key={i} className="bg-transparent font-semibold text-brand">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/** Pages matching every typed word, best first: name start, name, then description / everyday words. */
const search = (items: TItem[], query: string) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return items
    .map((it) => {
      const label = it.label.toLowerCase();
      const rest = `${it.description ?? ""} ${it.keywords ?? ""}`.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (label.startsWith(w) || label.includes(" " + w)) score += 3;
        else if (label.includes(w)) score += 2;
        else if (rest.includes(w)) score += 1;
        else return null;
      }
      return { it, score };
    })
    .filter((x): x is { it: TItem; score: number } => !!x)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.it);
};

/**
 * Search box in the top bar: type what you want ("marks", "whatsapp", "import
 * json") and jump to that page. Desktop: always shown. Phone: a search button
 * that opens the box across the bar (no room beside the centred logo).
 */
export function PageSearch({ routes }: { routes: TRoute[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false); // results list
  const [mobileOpen, setMobileOpen] = useState(false); // phone: the box itself
  const [active, setActive] = useState(0);
  const mobileInput = useRef<HTMLInputElement>(null);

  const items = useMemo<TItem[]>(() => {
    const visible = new Set(routes.map((r) => r.href));
    return [
      { label: "Home", href: "/", description: "Start page", keywords: "home dashboard start", tile: ROUTE_GROUPS.daily.tile },
      ...routes.map((r) => ({ label: r.label, href: r.href, description: r.description, keywords: r.keywords, tile: ROUTE_GROUPS[r.group].tile, Icon: r.Icon })),
      ...SEARCH_EXTRAS.filter((x) => visible.has(x.parent)).map((x) => {
        const parent = routes.find((r) => r.href === x.parent)!;
        return { label: x.label, href: x.href, description: `In ${parent.label}`, keywords: x.keywords, tile: ROUTE_GROUPS[parent.group].tile, Icon: parent.Icon };
      }),
    ];
  }, [routes]);
  // Empty box: the pages opened most recently (not the one you're on)
  const recentItems = useMemo(
    () => recent.filter((h) => h !== pathname).map((h) => items.find((i) => i.href === h)).filter((i): i is TItem => !!i).slice(0, 4),
    [recent, items, pathname]
  );
  const typed = query.trim().length > 0;
  const results = useMemo(() => (typed ? search(items, query) : recentItems), [items, query, typed, recentItems]);

  // Remember pages as they are opened (any way: menu, links, search)
  useEffect(() => {
    if (!items.some((i) => i.href === pathname)) return;
    try {
      const next = [pathname, ...readRecent().filter((h) => h !== pathname)].slice(0, 6);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      setRecent(next);
    } catch {
      /* private mode: no recents */
    }
  }, [pathname, items]);
  useEffect(() => setRecent(readRecent()), []);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    if (mobileOpen) mobileInput.current?.focus();
  }, [mobileOpen]);

  const go = (href: string) => {
    setQuery("");
    setOpen(false);
    setMobileOpen(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active].href);
    } else if (e.key === "Escape") {
      setOpen(false);
      setMobileOpen(false);
    }
  };

  const input = (ref?: React.Ref<HTMLInputElement>, id = "page-search") => (
    <div className="group relative min-w-0 flex-1">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-brand motion-reduce:transition-none" aria-hidden="true" />
      <input
        ref={ref}
        id={id}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Let a tap on a result land before the list closes
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder="Search pages"
        aria-label="Search pages"
        role="combobox"
        aria-expanded={open && !!query}
        aria-controls={`${id}-results`}
        aria-activedescendant={results[active] ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        className="h-11 w-full rounded-xl bg-muted pl-10 pr-10 text-sm outline-none placeholder:text-muted-foreground md:h-10 [&::-webkit-search-cancel-button]:hidden"
      />
      {/* Desktop only: on phones the single ✕ beside the box closes and clears */}
      {query && id !== "page-search-m" && (
        <button
          type="button"
          aria-label="Clear search"
          onMouseDown={(e) => {
            e.preventDefault();
            setQuery("");
          }}
          className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted md:size-8"
        >
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      )}
      {open && (
        <div
          id={`${id}-results`}
          className={cn(
            /* Flat, on the same level as the bar: no shadow, no border; the dimmed page
               behind (the scrim) is what sets it apart */
            "absolute z-50 overflow-hidden bg-card",
            // Phone: full width, flush under the bar; wider: a panel under the box
            id === "page-search-m" ? "-left-2 -right-[3.25rem] top-[calc(100%+0.375rem)] rounded-b-2xl" : "left-0 right-0 top-[calc(100%+0.5rem)] min-w-[20rem] rounded-2xl"
          )}
        >
          <p className="px-3.5 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {typed ? (results.length ? "Pages" : "") : results.length ? "Recent" : "Try searching"}
          </p>
          {!typed && !results.length && (
            <div className="flex flex-wrap gap-1.5 px-3.5 pb-3.5">
              {SUGGESTIONS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setQuery(w);
                  }}
                  className="h-9 rounded-lg bg-muted px-3.5 text-sm transition-colors hover:bg-brand-soft hover:text-brand motion-reduce:transition-none"
                >
                  {w}
                </button>
              ))}
            </div>
          )}
        <ul role="listbox" aria-label="Pages" className="p-1.5 pt-0">
          {results.length ? (
            results.map((r, i) => (
              <li key={r.href} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  // mousedown, not click: fires before the input's blur closes the list
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(r.href);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn("flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors motion-reduce:transition-none", i === active && "bg-muted")}
                >
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", r.tile)} aria-hidden="true">
                    {!typed ? <ClockIcon className="size-4" /> : r.Icon ? <r.Icon className="size-4" /> : <SearchIcon className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      <Highlight text={r.label} query={query} />
                    </span>
                    {r.description && <span className="block truncate text-xs text-muted-foreground">{r.description}</span>}
                  </span>
                  {i === active && <CornerDownLeftIcon className="hidden size-4 shrink-0 text-muted-foreground md:block" aria-hidden="true" />}
                </button>
              </li>
            ))
          ) : typed ? (
            <li className="px-2 pb-3 pt-1 text-sm">
              <p className="font-medium">No page matches “{query.trim()}”</p>
              <p className="mt-0.5 text-muted-foreground">Try another word, like “marks” or “students”, or open the menu for every page.</p>
            </li>
          ) : null}
        </ul>
        </div>
      )}
    </div>
  );

  return (
    <>
      {open && !mobileOpen && (
        // Dims the page under the open list (desktop), like the phone panel
        <div className="fixed inset-x-0 bottom-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-30 hidden bg-slate-900/25 md:block" aria-hidden="true" />
      )}
      {/* Desktop / tablet: always there, beside the menu button */}
      <div className="hidden w-56 md:flex lg:w-72">{input(undefined, "page-search")}</div>

      {/* Phone: a button that opens the box over the whole bar */}
      <button
        type="button"
        aria-label="Search pages"
        onClick={() => setMobileOpen(true)}
        className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:bg-muted md:hidden"
      >
        <SearchIcon className="size-5" aria-hidden="true" />
      </button>
      {mobileOpen && (
        // Dims the page; a tap outside closes search
        <div
          className="fixed inset-x-0 bottom-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-40 bg-slate-900/35 md:hidden"
          aria-hidden="true"
          onClick={() => {
            setQuery("");
            setMobileOpen(false);
          }}
        />
      )}
      {mobileOpen && (
        <div className="absolute inset-0 z-50 flex items-center gap-1 bg-card px-2 md:hidden">
          {input(mobileInput, "page-search-m")}
          <button
            type="button"
            aria-label="Close search"
            onClick={() => {
              setQuery("");
              setMobileOpen(false);
            }}
            className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted"
          >
            <XIcon className="size-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
