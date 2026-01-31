"use client";

import { useCurrentUser } from "@/hooks/useUser";
import { FanCalendarView } from "@/components/fan/CalendarView";
import { BandCalendarView } from "@/components/band/BandCalendar";

export default function CalendarPage() {
  const { isFan, isLoading } = useCurrentUser();

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
    return <FanCalendarView />;
  }

  return <BandCalendarView />;
}
