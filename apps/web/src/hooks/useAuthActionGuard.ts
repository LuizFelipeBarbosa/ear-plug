"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { buildAuthRedirectUrl, normalizeReturnTo } from "@/lib/auth/sso";

export function useAuthActionGuard() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const requireSignIn = useCallback(() => {
    if (!isLoaded) {
      return false;
    }

    if (isSignedIn) {
      return true;
    }

    const search = typeof window === "undefined" ? "" : window.location.search;
    const returnTo = normalizeReturnTo(`${pathname}${search}`);
    const signInUrl = buildAuthRedirectUrl("/sign-in", returnTo);
    router.push(signInUrl);
    return false;
  }, [isLoaded, isSignedIn, pathname, router]);

  return {
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    requireSignIn,
  };
}
