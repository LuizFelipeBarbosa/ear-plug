import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MapPin, LogOut, Settings, ChevronRight } from "lucide-react-native";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const user = useQuery(api.users.getCurrentUser);
  const band = useQuery(api.bands.getCurrentUserBand);

  const isFan = user?.role === "fan";

  if (!user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <View className="w-12 h-12 rounded-full bg-primary-500 animate-pulse" />
      </SafeAreaView>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView className="flex-1 bg-primary-600">
      <ScrollView>
        {/* Header */}
        <View className="p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white text-xl font-bold">Profile</Text>
            <TouchableOpacity className="p-2">
              <Settings size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Avatar */}
          <View className="flex-row items-center">
            <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center">
              <Text className="text-white text-2xl font-bold">
                {getInitials(user.name)}
              </Text>
            </View>
            <View className="ml-4">
              <Text className="text-white text-xl font-bold">{user.name}</Text>
              {user.location && (
                <View className="flex-row items-center mt-1">
                  <MapPin size={14} color="rgba(255,255,255,0.7)" />
                  <Text className="text-white/70 text-sm ml-1">
                    {user.location}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats */}
          {isFan && (
            <View className="flex-row mt-6 bg-white/10 rounded-xl p-4">
              <View className="flex-1 items-center">
                <Text className="text-white text-xl font-bold">
                  {user.showsAttended || 0}
                </Text>
                <Text className="text-white/70 text-xs">Shows Attended</Text>
              </View>
              <View className="w-px h-full bg-white/20" />
              <View className="flex-1 items-center">
                <Text className="text-white text-xl font-bold">
                  {new Date(user.memberSince).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
                <Text className="text-white/70 text-xs">Member Since</Text>
              </View>
            </View>
          )}

          {/* Band Info for Musicians */}
          {!isFan && band && (
            <View className="mt-6 bg-white/10 rounded-xl p-4">
              <Text className="text-white font-semibold">{band.name}</Text>
              <Text className="text-white/70 text-sm mt-1">
                {(band.genres?.[0] ?? band.genre ?? "genre tbd")
                  .charAt(0)
                  .toUpperCase() +
                  (band.genres?.[0] ?? band.genre ?? "genre tbd").slice(1)} •{" "}
                {band.location}
              </Text>
            </View>
          )}
        </View>

        {/* Content Area */}
        <View className="bg-white rounded-t-3xl min-h-screen">
          {/* Menu Items */}
          <View className="p-4">
            {isFan ? (
              <>
                <MenuItem title="Top Genres" subtitle="Jazz, Indie, Rock" />
                <MenuItem title="Saved Artists" subtitle="5 artists" />
                <MenuItem title="Saved Venues" subtitle="3 venues" />
              </>
            ) : (
              <>
                <MenuItem title="Edit Band Profile" />
                <MenuItem title="Analytics Report" />
                <MenuItem title="Media Gallery" />
              </>
            )}
          </View>

          {/* Sign Out */}
          <View className="p-4 pt-8">
            <TouchableOpacity
              onPress={() => signOut()}
              className="flex-row items-center justify-center py-3 rounded-xl"
            >
              <LogOut size={20} color="#dc2626" />
              <Text className="ml-2 text-red-600 font-medium">Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-gray-100">
      <View>
        <Text className="font-medium text-gray-900">{title}</Text>
        {subtitle && (
          <Text className="text-sm text-gray-500 mt-0.5">{subtitle}</Text>
        )}
      </View>
      <ChevronRight size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
}
