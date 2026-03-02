"use client";

import { FanProfileView } from "@/components/fan/ProfileView";
import { BandProfileView } from "@/components/band/BandProfile";
import { AppModePageGate } from "@/components/navigation/AppModePageGate";

export default function ProfilePage() {
  return (
    <AppModePageGate
      personalView={<FanProfileView />}
      bandView={<BandProfileView />}
    />
  );
}
