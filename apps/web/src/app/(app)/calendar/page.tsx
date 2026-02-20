"use client";

import { useCurrentUser } from "@/hooks/useUser";
import { useProfileContext } from "@/hooks/useProfileContext";
import { FanCalendarView } from "@/components/fan/CalendarView";
import { BandCalendarView } from "@/components/band/BandCalendar";

export default function CalendarPage() {
  const { isLoading } = useCurrentUser();
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

  if (mode === "personal") {
    return <FanCalendarView />;
  }

  return <BandCalendarView />;
}
