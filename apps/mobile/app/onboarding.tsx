import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { Headphones, Mic2, Users } from "lucide-react-native";
import { useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { onboardingStorageKey } from "@/constants/storage";

type UserRole = "fan" | "musician";

export default function OnboardingScreen() {
  const { isSignedIn, userId } = useAuth();
  const updateRole = useMutation(api.users.updateRole);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = async (role: UserRole) => {
    if (!isSignedIn || !userId || pending) {
      router.replace("/sign-in");
      return;
    }

    setSelectedRole(role);
    setPending(true);
    setError(null);

    try {
      await updateRole({ role });
      await AsyncStorage.setItem(onboardingStorageKey(userId), "true");
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete onboarding.");
      setPending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-950">
      <View className="flex-1 p-6">
        <View className="flex-row items-center">
          <Headphones size={30} color="#93c5fd" />
          <Text className="ml-2 text-2xl font-bold text-white">Ear-Plug</Text>
        </View>
        <Text className="mt-1 text-sm text-blue-200">Listen Local</Text>

        <View className="flex-1 justify-center">
          <Text className="text-center text-3xl font-bold text-white">Choose Your Experience</Text>
          <Text className="mt-2 text-center text-blue-200">
            You can switch between personal and band workspaces later.
          </Text>

          <TouchableOpacity
            onPress={() => void complete("fan")}
            disabled={pending}
            className={`mt-8 rounded-2xl border-2 p-5 ${
              selectedRole === "fan" ? "border-blue-300 bg-white/20" : "border-white/20 bg-white/10"
            }`}
          >
            <View className="flex-row items-center">
              <View className="rounded-xl bg-blue-500/30 p-3">
                <Users size={28} color="#bfdbfe" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-xl font-semibold text-white">I&apos;m a Fan</Text>
                <Text className="mt-1 text-sm text-blue-100">Discover shows, RSVP, and follow local bands.</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void complete("musician")}
            disabled={pending}
            className={`mt-4 rounded-2xl border-2 p-5 ${
              selectedRole === "musician" ? "border-violet-300 bg-white/20" : "border-white/20 bg-white/10"
            }`}
          >
            <View className="flex-row items-center">
              <View className="rounded-xl bg-violet-500/30 p-3">
                <Mic2 size={28} color="#ddd6fe" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-xl font-semibold text-white">I&apos;m a Musician</Text>
                <Text className="mt-1 text-sm text-blue-100">Manage your band workspace and book gigs.</Text>
              </View>
            </View>
          </TouchableOpacity>

          {pending ? <Text className="mt-4 text-center text-sm text-blue-200">Finishing setup...</Text> : null}
          {error ? <Text className="mt-3 text-center text-sm text-red-200">{error}</Text> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
