"use client";

import { FanCalendarView } from "@/components/fan/CalendarView";
import { BandCalendarView } from "@/components/band/BandCalendar";
import { AppModePageGate } from "@/components/navigation/AppModePageGate";

export default function CalendarPage() {
  return (
    <AppModePageGate
      personalView={<FanCalendarView />}
      bandView={<BandCalendarView />}
    />
  );
}
