"use client";

import { usePathname } from "next/navigation";
import { normalizeReturnTo } from "@/lib/auth/sso";

export function buildHrefWithReturnTo(href: string, returnTo: string) {
  const url = new URL(href, "http://localhost");
  url.searchParams.set("returnTo", returnTo);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function useCurrentReturnTo(fallbackReturnTo = "/home") {
  const pathname = usePathname();
  return normalizeReturnTo(pathname, fallbackReturnTo);
}
