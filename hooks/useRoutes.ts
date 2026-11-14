"use client";

import { useAuth } from "@/context/auth-context";
import { routesFor } from "@/data/routes";
import { Role } from "@/data/const";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export const useRoutes = () => {
  const { account } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const routes = routesFor(account?.role === Role.ADMIN);

  useEffect(() => {
    // Home matches no route; replacing "/" with "/" would re-render it for nothing
    if (pathname === "/") return;
    const route = routes.find((route) => pathname.includes(route.href));
    if (!route) {
      router.replace("/");
    }
  }, [pathname, account?.role, router]);

  return routes;
};
