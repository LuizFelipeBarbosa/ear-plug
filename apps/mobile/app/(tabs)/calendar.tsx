import { BandCalendarScreen } from "@/screens/BandCalendarScreen";
import { FanCalendarScreen } from "@/screens/FanCalendarScreen";
import { useProfileContext } from "@/context/ProfileContext";

export default function CalendarTabScreen() {
  const { mode } = useProfileContext();
  return mode === "personal" ? <FanCalendarScreen /> : <BandCalendarScreen />;
}
