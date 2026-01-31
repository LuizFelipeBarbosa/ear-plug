import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from "react-native";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Map, Search } from "lucide-react-native";

export default function HomeScreen() {
  const user = useQuery(api.users.getCurrentUser);
  const events = useQuery(api.events.listUpcoming, { limit: 10 });
  
  const isFan = user?.role === "fan";

  if (!user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <View className="w-12 h-12 rounded-full bg-primary-500 animate-pulse" />
      </SafeAreaView>
    );
  }

  if (isFan) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        {/* Search Bar */}
        <View className="p-4">
          <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
            <Search size={20} color="#9ca3af" />
            <Text className="ml-2 text-gray-400">Search events, bands, venues...</Text>
          </View>
        </View>

        {/* Map Placeholder */}
        <View className="flex-1 bg-gray-100 items-center justify-center">
          <Map size={48} color="#9ca3af" />
          <Text className="mt-4 text-gray-500">Map view coming soon</Text>
          <Text className="text-gray-400 text-sm mt-1">Use the web app for full map experience</Text>
        </View>

        {/* Near You */}
        <View className="p-4 bg-white border-t border-gray-200">
          <Text className="text-lg font-bold text-gray-900 mb-3">Near You</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {events?.slice(0, 5).map((event) => (
              <TouchableOpacity
                key={event._id}
                className="w-40 mr-3 bg-gray-50 rounded-xl overflow-hidden"
              >
                <View className="h-24 bg-gradient-to-br from-primary-400 to-accent-400" />
                <View className="p-3">
                  <Text className="font-semibold text-gray-900" numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    {event.venue?.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // Band Dashboard
  return (
    <SafeAreaView className="flex-1 bg-primary-600">
      <ScrollView>
        {/* Header */}
        <View className="p-6">
          <Text className="text-white text-xl font-bold">Dashboard</Text>
          <Text className="text-white/70 mt-1">Welcome back!</Text>
        </View>

        {/* Stats */}
        <View className="flex-row px-4 pb-6">
          <View className="flex-1 bg-white/10 rounded-xl p-4 mr-2">
            <Text className="text-white text-2xl font-bold">0</Text>
            <Text className="text-white/70 text-xs">Shows This Month</Text>
          </View>
          <View className="flex-1 bg-white/10 rounded-xl p-4 mx-2">
            <Text className="text-white text-2xl font-bold">0</Text>
            <Text className="text-white/70 text-xs">Total RSVPs</Text>
          </View>
          <View className="flex-1 bg-white/10 rounded-xl p-4 ml-2">
            <Text className="text-white text-2xl font-bold">0</Text>
            <Text className="text-white/70 text-xs">New Fans</Text>
          </View>
        </View>

        {/* Content Area */}
        <View className="bg-gray-50 rounded-t-3xl min-h-screen p-4">
          <Text className="text-lg font-bold text-gray-900 mb-3">
            Open Dates
          </Text>
          <View className="bg-white rounded-xl p-4 items-center justify-center h-32">
            <Text className="text-gray-400">No open dates available</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
