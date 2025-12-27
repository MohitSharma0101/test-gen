"use client";

import { useAuth } from "@/context/auth-context";
import { ROUTES } from "@/data/routes";
import { Role } from "@/data/const";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export const useRoutes = () => {
  const { account } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const routes = ROUTES.filter((route) => !route.adminOnly || account?.role === Role.ADMIN);

  useEffect(() => {
    const route = routes.find((route) => pathname.includes(route.href));
    if (!route) {
      router.replace("/");
    }
  }, [pathname, account?.role, router]);

  return routes;
};
