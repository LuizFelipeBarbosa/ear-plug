import { useState } from "react";
import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { router } from "expo-router";
import { SignedIn, SignedOut, useAuth, useUser, useSignIn, useSignUp } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Users, Mic2, ArrowRight, Headphones } from "lucide-react-native";

type UserRole = "fan" | "musician";

export default function OnboardingScreen() {
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const upsertUser = useMutation(api.users.upsertUser);
  const updateRole = useMutation(api.users.updateRole);

  const handleRoleSelect = async (role: UserRole) => {
    setSelectedRole(role);

    if (isSignedIn && clerkUser) {
      try {
        await upsertUser({
          clerkId: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || "",
          phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber,
          name: clerkUser.fullName || clerkUser.firstName || "User",
          avatar: clerkUser.imageUrl,
        });

        await updateRole({ role });
        router.replace("/(tabs)");
      } catch (error) {
        console.error("Failed to complete onboarding:", error);
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-primary-900">
      {/* Gradient Background */}
      <View className="absolute inset-0 bg-gradient-to-b from-primary-800 to-accent-900" />

      {/* Content */}
      <View className="flex-1 p-6">
        {/* Header */}
        <View className="flex-row items-center">
          <Headphones size={32} color="#a78bfa" />
          <Text className="text-2xl font-bold text-white ml-2">Ear-Plug</Text>
        </View>
        <Text className="text-primary-200 mt-1 ml-10">Listen Local</Text>

        {/* Role Selection */}
        <View className="flex-1 justify-center">
          <Text className="text-3xl font-bold text-white text-center mb-2">
            How will you use Ear-Plug?
          </Text>
          <Text className="text-white/70 text-center mb-8">
            Choose your experience to get started
          </Text>

          {/* Fan Option */}
          <TouchableOpacity
            onPress={() => handleRoleSelect("fan")}
            className={`p-6 rounded-2xl border-2 mb-4 ${
              selectedRole === "fan"
                ? "border-primary-400 bg-white/20"
                : "border-white/20 bg-white/10"
            }`}
          >
            <View className="flex-row items-center">
              <View className="p-3 rounded-xl bg-primary-500/30">
                <Users size={32} color="#a78bfa" />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-xl font-semibold text-white">
                  I&apos;m a Fan
                </Text>
                <Text className="text-white/60 mt-1">
                  Discover shows, follow bands, and never miss a gig
                </Text>
              </View>
              <ArrowRight size={24} color="rgba(255,255,255,0.4)" />
            </View>
          </TouchableOpacity>

          {/* Musician Option */}
          <TouchableOpacity
            onPress={() => handleRoleSelect("musician")}
            className={`p-6 rounded-2xl border-2 ${
              selectedRole === "musician"
                ? "border-accent-400 bg-white/20"
                : "border-white/20 bg-white/10"
            }`}
          >
            <View className="flex-row items-center">
              <View className="p-3 rounded-xl bg-accent-500/30">
                <Mic2 size={32} color="#f472b6" />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-xl font-semibold text-white">
                  I&apos;m a Musician
                </Text>
                <Text className="text-white/60 mt-1">
                  Promote shows, find gigs, and grow your fanbase
                </Text>
              </View>
              <ArrowRight size={24} color="rgba(255,255,255,0.4)" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text className="text-white/50 text-sm text-center">
          Discover live music in the Bay Area
        </Text>
      </View>
    </SafeAreaView>
  );
}
