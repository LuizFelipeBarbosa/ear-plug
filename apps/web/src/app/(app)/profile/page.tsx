"use client";
import { Suspense } from "react";

import { FanProfileView } from "@/components/fan/ProfileView";
import { BandProfileView } from "@/components/band/BandProfile";
import { AppModePageGate } from "@/components/navigation/AppModePageGate";

function ProfilePageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-12 h-12 bg-fan animate-pulse-fan" />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AppModePageGate
      personalView={
        <Suspense fallback={<ProfilePageFallback />}>
          <FanProfileView />
        </Suspense>
      }
      bandView={<BandProfileView />}
    />
  );
}
