"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";

const AUTH_ROUTE_PREFIXES = ["/login"];

function isAuthRoute(pathname: string) {
  return AUTH_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function NavigationGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, session } = useAuth();

  useEffect(() => {
    if (!pathname || session.isLoading) return;

    if (!isAuthenticated && !isAuthRoute(pathname)) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && isAuthRoute(pathname)) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, pathname, router, session.isLoading]);

  return null;
}
