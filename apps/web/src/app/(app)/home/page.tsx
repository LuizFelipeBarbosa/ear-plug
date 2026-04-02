"use client";
import { Suspense } from "react";
import { FanDiscoverView } from "@/components/fan/DiscoverView";
import { BandDashboard } from "@/components/band/BandDashboard";
import { AppModePageGate } from "@/components/navigation/AppModePageGate";

function HomePageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-12 h-12 bg-fan animate-pulse-fan" />
    </div>
  );
}

export default function HomePage() {
  return (
    <AppModePageGate
      personalView={
        <Suspense fallback={<HomePageFallback />}>
          <FanDiscoverView />
        </Suspense>
      }
      bandView={<BandDashboard />}
      fallbackToPersonalWhenNoUser
    />
  );
}
