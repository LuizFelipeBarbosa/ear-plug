import { BandAnalyticsScreen } from "@/screens/BandAnalyticsScreen";
import { useProfileContext } from "@/context/ProfileContext";
import { Text, View } from "react-native";

export default function AnalyticsTabScreen() {
  const { mode } = useProfileContext();

  if (mode === "personal") {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-gray-500 text-center">Switch to a band workspace to view analytics.</Text>
      </View>
    );
  }

  return <BandAnalyticsScreen />;
}
