"use client";

import { useCurrentUser } from "@/hooks/useUser";
import { FanMapView } from "@/components/fan/MapView";
import { BandDashboard } from "@/components/band/BandDashboard";

export default function HomePage() {
  const { user, isFan, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full bg-primary-500" />
        </div>
      </div>
    );
  }

  if (isFan) {
    return <FanMapView />;
  }

  return <BandDashboard />;
}
