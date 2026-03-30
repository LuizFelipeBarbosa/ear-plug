import { BandDashboardScreen } from "@/screens/BandDashboardScreen";
import { FanDiscoverScreen } from "@/screens/FanDiscoverScreen";
import { useProfileContext } from "@/context/ProfileContext";

export default function HomeTabScreen() {
  const { mode } = useProfileContext();
  return mode === "personal" ? <FanDiscoverScreen /> : <BandDashboardScreen />;
}
