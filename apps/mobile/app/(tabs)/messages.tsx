import { BandMessagesScreen } from "@/screens/BandMessagesScreen";
import { FanNotificationsScreen } from "@/screens/FanNotificationsScreen";
import { useProfileContext } from "@/context/ProfileContext";

export default function MessagesTabScreen() {
  const { mode } = useProfileContext();
  return mode === "personal" ? <FanNotificationsScreen /> : <BandMessagesScreen />;
}
