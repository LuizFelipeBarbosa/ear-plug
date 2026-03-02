"use client";
import { useCurrentUser } from "@/hooks/useUser";
import { useProfileContext } from "@/hooks/useProfileContext";
import { FanDiscoverView } from "@/components/fan/DiscoverView";
import { BandDashboard } from "@/components/band/BandDashboard";
export default function HomePage() {
  const { user, isLoading } = useCurrentUser();
  const { mode, isHydrated } = useProfileContext();
  if (isLoading || !isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-fan animate-pulse-fan" />
        </div>
      </div>
    );
  }
  if (!user || mode === "personal") {
    return <FanDiscoverView />;
  }
  return <BandDashboard />;
}
