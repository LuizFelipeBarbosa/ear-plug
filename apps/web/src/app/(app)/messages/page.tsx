"use client";

import { useCurrentUser } from "@/hooks/useUser";
import { FanNotificationsView } from "@/components/fan/NotificationsView";
import { BandMessagesView } from "@/components/band/BandMessages";

export default function MessagesPage() {
  const { isFan, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-lime animate-pulse-lime" />
        </div>
      </div>
    );
  }

  if (isFan) {
    return <FanNotificationsView />;
  }

  return <BandMessagesView />;
}
