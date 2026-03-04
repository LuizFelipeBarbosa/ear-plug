import { ActivityIndicator, Text, View } from "react-native";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#2563eb" />
      <Text className="mt-3 text-sm text-gray-500">{label}</Text>
    </View>
  );
}
