"use client";
import { FanDiscoverView } from "@/components/fan/DiscoverView";
import { BandDashboard } from "@/components/band/BandDashboard";
import { AppModePageGate } from "@/components/navigation/AppModePageGate";

export default function HomePage() {
  return (
    <AppModePageGate
      personalView={<FanDiscoverView />}
      bandView={<BandDashboard />}
      fallbackToPersonalWhenNoUser
    />
  );
}
