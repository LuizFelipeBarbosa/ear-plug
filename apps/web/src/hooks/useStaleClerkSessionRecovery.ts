"use client";

import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

interface UseStaleClerkSessionRecoveryOptions {
  enabled?: boolean;
  redirectUrl?: string;
}

export function useStaleClerkSessionRecovery(
  options: UseStaleClerkSessionRecoveryOptions = {},
) {
  const {
    enabled = true,
    redirectUrl = "/sign-in?notice=session-expired",
  } = options;
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: isClerkUserLoaded, user } = useUser();
  const [isRecovering, setIsRecovering] = useState(false);
  const hasStartedRecoveryRef = useRef(false);

  const hasStaleSession =
    enabled && isLoaded && isClerkUserLoaded && isSignedIn && !user;

  useEffect(() => {
    if (!hasStaleSession || hasStartedRecoveryRef.current) {
      return;
    }

    hasStartedRecoveryRef.current = true;
    setIsRecovering(true);

    void clerk.signOut({ redirectUrl }).catch(() => {
      if (typeof window !== "undefined") {
        window.location.assign(redirectUrl);
      }
    });
  }, [clerk, hasStaleSession, redirectUrl]);

  return {
    hasStaleSession,
    isRecovering: isRecovering || hasStaleSession,
  };
}
