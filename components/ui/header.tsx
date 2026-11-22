"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, MenuIcon, XIcon } from "lucide-react";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import AccountMenu from "./account-menu";
import { PageSearch } from "./page-search";
import { useRoutes } from "@/hooks/useRoutes";
import { ROUTE_GROUPS, routeForPath, type TRoute, type TRouteGroup } from "@/data/routes";
import { cn } from "@/lib/utils";

const Logo = () => (
  <span className="flex items-center gap-2">
    <Image
      src="/eplus-logo-min.png"
      alt=""
      width={746}
      height={500}
      sizes="48px"
      priority
      className="-mt-1 h-8 w-auto object-contain"
    />
    <span className="text-base font-bold leading-none">Education+</span>
  </span>
);

const MenuLink = ({ route, active }: { route: Pick<TRoute, "href" | "label" | "Icon" | "group">; active: boolean }) => (
  <Link
    href={route.href}
    aria-current={active ? "page" : undefined}
    className={cn(
      "flex min-h-[2.75rem] items-center gap-3 rounded-lg px-2 py-1.5 text-sm md:short:min-h-[2.25rem] md:short:py-1 font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
      active && "bg-brand-soft text-brand hover:bg-brand-soft"
    )}
  >
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg md:short:size-7", ROUTE_GROUPS[route.group].tile)}>
      <route.Icon className="size-[18px]" strokeWidth={2} aria-hidden="true" />
    </span>
    {route.label}
  </Link>
);

// Top bar for every signed-in page, same on phone and desktop:
// account · centred logo · page search · menu button (menu on the right, in thumb reach). The menu opens a side sheet with every page,
// grouped. Nothing is pinned to the side, so heavy pages keep the full width.
const Header = () => {
  const routes = useRoutes(); // also redirects unknown paths to "/"
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Picking a page closes the sheet
  useEffect(() => setOpen(false), [pathname]);

  const currentHref = pathname === "/" ? "/" : routeForPath(pathname)?.href;
  const groups = (Object.keys(ROUTE_GROUPS) as TRouteGroup[])
    .map((group) => ({ group, items: routes.filter((r) => r.group === group) }))
    .filter((g) => g.items.length > 0);

  return (
    <header className="sticky top-0 z-40 border-b bg-card pt-[env(safe-area-inset-top)] print:hidden">
      <div className="relative mx-auto flex h-14 max-w-screen-2xl items-center px-2 sm:px-4">
        <AccountMenu />

        <Link
          href="/"
          // Centred on the bar itself, not between the two buttons
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Logo />
        </Link>

        <div className="ml-auto flex items-center gap-1 md:gap-2">
        <PageSearch routes={routes} />
        <Drawer direction="right" open={open} onOpenChange={setOpen}>
            <DrawerTrigger
              aria-label="Open menu"
              className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:bg-muted"
            >
              <MenuIcon className="size-5" aria-hidden="true" />
            </DrawerTrigger>
            <DrawerContent
              // Floats 8px off the edges (clear of notch/home bar). Short desktop screens:
              // wider drawer with two columns so the whole menu
              // fits without scrolling
              className="!bottom-[calc(0.5rem+env(safe-area-inset-bottom))] !right-2 !top-[calc(0.5rem+env(safe-area-inset-top))] overflow-hidden !rounded-2xl border shadow-2xl outline-none md:short:!w-[34rem] md:short:!max-w-[34rem]"
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b pl-4 pr-2">
                <DrawerTitle asChild>
                  <span>
                    <Logo />
                  </span>
                </DrawerTitle>
                <DrawerDescription className="sr-only">All pages</DrawerDescription>
                <DrawerClose
                  aria-label="Close menu"
                  className="flex size-10 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <XIcon className="size-5" aria-hidden="true" />
                </DrawerClose>
              </div>
              <nav
                aria-label="Main"
                className="flex-1 space-y-4 overflow-y-auto px-3 py-3 scrollbar-hide md:short:grid md:short:grid-cols-2 md:short:content-start md:short:gap-x-3 md:short:gap-y-3 md:short:space-y-0"
              >
                <div className="md:short:col-span-2">
                  <MenuLink
                    route={{ href: "/", label: "Home", Icon: HomeIcon, group: "daily" }}
                    active={currentHref === "/"}
                  />
                </div>
                {groups.map(({ group, items }) => (
                  <section key={group} aria-labelledby={`menu-${group}`}>
                    <h2
                      id={`menu-${group}`}
                      className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      {ROUTE_GROUPS[group].label}
                    </h2>
                    <div className="space-y-0.5">
                      {items.map((route) => (
                        <MenuLink key={route.href} route={route} active={route.href === currentHref} />
                      ))}
                    </div>
                  </section>
                ))}
              </nav>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </header>
  );
};

export default Header;
