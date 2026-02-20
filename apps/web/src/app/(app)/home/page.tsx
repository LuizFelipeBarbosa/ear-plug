"use client";

import { useCurrentUser } from "@/hooks/useUser";
import { useProfileContext } from "@/hooks/useProfileContext";
import { FanMapView } from "@/components/fan/MapView";
import { BandDashboard } from "@/components/band/BandDashboard";

export default function HomePage() {
  const { user, isLoading } = useCurrentUser();
  const { mode, isHydrated } = useProfileContext();

  if (isLoading || !isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-lime animate-pulse-lime" />
        </div>
      </div>
    );
  }

  if (!user || mode === "personal") {
    return <FanMapView />;
  }

  return <BandDashboard />;
}
