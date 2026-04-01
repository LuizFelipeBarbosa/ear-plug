"use client";

import type { ReactNode } from "react";
import { useCurrentUser } from "@/hooks/useUser";
import { useProfileContext } from "@/hooks/useProfileContext";

interface AppModePageGateProps {
  personalView: ReactNode;
  bandView: ReactNode;
  fallbackToPersonalWhenNoUser?: boolean;
}

function AppPageLoadingShell() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-12 h-12 bg-fan animate-pulse-fan" />
    </div>
  );
}

export function AppModePageGate({
  personalView,
  bandView,
  fallbackToPersonalWhenNoUser = false,
}: AppModePageGateProps) {
  const { user, isLoading } = useCurrentUser();
  const { mode, isHydrated } = useProfileContext();

  if (isLoading || !isHydrated) {
    return <AppPageLoadingShell />;
  }

  const showPersonalView =
    mode === "personal" || (fallbackToPersonalWhenNoUser && !user);

  return <>{showPersonalView ? personalView : bandView}</>;
}
