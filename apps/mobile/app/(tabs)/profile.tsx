import { BandProfileScreen } from "@/screens/BandProfileScreen";
import { FanProfileScreen } from "@/screens/FanProfileScreen";
import { useProfileContext } from "@/context/ProfileContext";

export default function ProfileTabScreen() {
  const { mode } = useProfileContext();
  return mode === "personal" ? <FanProfileScreen /> : <BandProfileScreen />;
}
