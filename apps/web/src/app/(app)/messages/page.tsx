"use client";
import { useCurrentUser } from "@/hooks/useUser";
import { useProfileContext } from "@/hooks/useProfileContext";
import { FanNotificationsView } from "@/components/fan/NotificationsView";
import { BandMessagesView } from "@/components/band/BandMessages";
export default function MessagesPage() {
  const { isLoading } = useCurrentUser();
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
  if (mode === "personal") {
    return <FanNotificationsView />;
  }
  return <BandMessagesView />;
}
