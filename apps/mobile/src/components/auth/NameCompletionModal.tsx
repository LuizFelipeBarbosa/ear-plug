import { useEffect, useState } from "react";
import { Modal, Text, TextInput, View } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  composePersonalName,
  getProfileLocationValidationError,
  getPersonalNameValidationError,
  normalizeProfileLocation,
  normalizePersonalNamePart,
  splitPersonalName,
} from "@ear-plug/shared/utils";
import { api } from "../../../../../convex/_generated/api";
import { ActionButton } from "@/components/ui/AppPrimitives";

interface NameCompletionModalProps {
  visible: boolean;
}

export function NameCompletionModal({ visible }: NameCompletionModalProps) {
  const { user: clerkUser } = useUser();
  const convexUser = useQuery(api.users.getCurrentUser);
  const updateClerkPersonalName = useAction(api.users.updateClerkPersonalName);
  const upsertUser = useMutation(api.users.upsertUser);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const fallbackName = splitPersonalName(clerkUser?.fullName);
    setFirstName(clerkUser?.firstName ?? fallbackName.firstName);
    setLastName(clerkUser?.lastName ?? fallbackName.lastName);
    setLocation(convexUser?.location ?? "");
    setError(null);
  }, [
    clerkUser?.firstName,
    clerkUser?.fullName,
    clerkUser?.lastName,
    convexUser?.location,
    visible,
  ]);

  const handleSave = async () => {
    if (!clerkUser) {
      setError("Your account is still loading. Try again in a moment.");
      return;
    }

    const validationError = getPersonalNameValidationError(firstName, lastName);
    if (validationError) {
      setError(validationError);
      return;
    }

    const locationValidationError = getProfileLocationValidationError(location);
    if (locationValidationError) {
      setError(locationValidationError);
      return;
    }

    const normalizedFirstName = normalizePersonalNamePart(firstName);
    const normalizedLastName = normalizePersonalNamePart(lastName);
    const normalizedLocation = normalizeProfileLocation(location);

    setIsSaving(true);
    setError(null);

    try {
      await updateClerkPersonalName({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
      });
      await clerkUser.reload();
      await upsertUser({
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber,
        name: composePersonalName(normalizedFirstName, normalizedLastName),
        avatar: clerkUser.imageUrl,
        location: normalizedLocation,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "We couldn't save your profile. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
      presentationStyle="overFullScreen"
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="rounded-t-[28px] bg-[#fbf8f3] px-5 pb-8 pt-6">
          <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-[#9d5c3f]">
            Complete Profile
          </Text>
          <Text className="mt-3 text-2xl font-bold text-[#111827]">
            Add your name and location
          </Text>
          <Text className="mt-3 text-sm leading-6 text-[#5b5f69]">
            Ear-Plug needs your full name and home city before you can continue into
            the app.
          </Text>

          <View className="mt-5 gap-3">
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor="#8f95a3"
              autoComplete="name-given"
              textContentType="givenName"
              className="min-h-[48px] rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900"
            />

            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor="#8f95a3"
              autoComplete="name-family"
              textContentType="familyName"
              className="min-h-[48px] rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900"
            />

            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="City, State"
              placeholderTextColor="#8f95a3"
              autoComplete="postal-address-locality"
              textContentType="addressCity"
              className="min-h-[48px] rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900"
            />
          </View>

          {error ? (
            <View className="mt-4 rounded-[18px] border border-[#f4b8a8] bg-[#fff1eb] px-4 py-3">
              <Text className="text-sm leading-5 text-[#8e2f16]">{error}</Text>
            </View>
          ) : null}

          <View className="mt-5">
            <ActionButton
              label={isSaving ? "Saving..." : "Save and Continue"}
              tone="fan"
              disabled={isSaving}
              onPress={() => void handleSave()}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
