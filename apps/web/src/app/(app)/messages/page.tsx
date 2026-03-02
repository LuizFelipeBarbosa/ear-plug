"use client";

import { FanNotificationsView } from "@/components/fan/NotificationsView";
import { BandMessagesView } from "@/components/band/BandMessages";
import { AppModePageGate } from "@/components/navigation/AppModePageGate";

export default function MessagesPage() {
  return (
    <AppModePageGate
      personalView={<FanNotificationsView />}
      bandView={<BandMessagesView />}
    />
  );
}
