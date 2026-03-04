import { useProfileContext } from "@/context/ProfileContext";
import { useEvent, useEventCheckinAccess, useEventCheckinStaff, useEventTicketScanner } from "@/hooks/useEvents";
import type { EventCheckinAssignableUser, EventTicketScanResult } from "@ear-plug/shared/types";
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, QrCode, Search, Shield, UserPlus, Users } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { Id } from "../../../../../convex/_generated/dataModel";

function getResultTitle(result: EventTicketScanResult | null): string {
  if (!result) return "";
  if (result.status === "checked_in") return "Checked In";
  if (result.status === "already_used") return "Already Used";
  if (result.status === "revoked") return "Revoked";
  return "Invalid";
}

function getResultTone(result: EventTicketScanResult | null): "green" | "amber" | "red" | "gray" {
  if (!result) return "gray";
  if (result.status === "checked_in") return "green";
  if (result.status === "already_used") return "amber";
  if (result.status === "revoked") return "red";
  return "gray";
}

export default function EventCheckinScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id as Id<"events">;
  const { bandId } = useProfileContext();

  const { event } = useEvent(eventId);
  const { canScan, canManageStaff, managerBandIds, isLoading: accessLoading } = useEventCheckinAccess(eventId);
  const { scanTicket } = useEventTicketScanner(eventId);

  const managerBandId = useMemo<Id<"bands"> | undefined>(() => {
    if (!canManageStaff) return undefined;
    if (bandId && managerBandIds.includes(bandId as Id<"bands">)) {
      return bandId as Id<"bands">;
    }
    return managerBandIds[0];
  }, [bandId, canManageStaff, managerBandIds]);

  const {
    staff,
    isLoading: staffLoading,
    searchAssignableUsers,
    assignByUserId,
    removeStaff,
  } = useEventCheckinStaff(eventId, managerBandId);

  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState("");
  const [scanPending, setScanPending] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<EventTicketScanResult | null>(null);
  const [lastScanAt, setLastScanAt] = useState(0);

  const [staffQuery, setStaffQuery] = useState("");
  const [searchPending, setSearchPending] = useState(false);
  const [suggestions, setSuggestions] = useState<EventCheckinAssignableUser[]>([]);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffMessage, setStaffMessage] = useState<string | null>(null);
  const [assignPendingUserId, setAssignPendingUserId] = useState<string | null>(null);
  const [removePendingUserId, setRemovePendingUserId] = useState<string | null>(null);
  const handlingScanRef = useRef(false);

  const submitScan = async (qrValue: string) => {
    if (!qrValue.trim() || scanPending || handlingScanRef.current) return;
    handlingScanRef.current = true;
    setScanPending(true);
    setScanError(null);

    try {
      const result = await scanTicket(qrValue.trim());
      setLastResult(result);
      setManualCode("");
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Failed to scan ticket.");
    } finally {
      setScanPending(false);
      setTimeout(() => {
        handlingScanRef.current = false;
      }, 600);
    }
  };

  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    const now = Date.now();
    if (now - lastScanAt < 1200) return;
    setLastScanAt(now);
    void submitScan(result.data);
  };

  const searchUsers = async () => {
    if (!managerBandId || staffQuery.trim().length < 2 || searchPending) return;
    setSearchPending(true);
    setStaffError(null);
    setStaffMessage(null);

    try {
      const users = await searchAssignableUsers(staffQuery.trim(), 8);
      setSuggestions(users);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : "Failed to search users.");
    } finally {
      setSearchPending(false);
    }
  };

  if (accessLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Loading check-in access...</Text>
      </View>
    );
  }

  if (!canScan) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <View className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <View className="flex-row items-center justify-center">
            <Shield size={18} color="#6b7280" />
            <Text className="ml-2 text-base font-semibold text-gray-800">Access Required</Text>
          </View>
          <Text className="mt-2 text-center text-sm text-gray-600">
            Only event managers or assigned door staff can scan tickets.
          </Text>
          <TouchableOpacity onPress={() => router.replace(`/gig/${eventId}`)} className="mt-4 rounded-xl bg-blue-600 py-2.5">
            <Text className="text-center font-semibold text-white">Back to Event</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const tone = getResultTone(lastResult);
  const resultToneClass =
    tone === "green"
      ? "border-green-300 bg-green-50 text-green-700"
      : tone === "amber"
        ? "border-amber-300 bg-amber-50 text-amber-700"
        : tone === "red"
          ? "border-red-300 bg-red-50 text-red-700"
          : "border-gray-300 bg-gray-100 text-gray-700";

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, paddingBottom: 84 }}>
      <View className="flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="rounded-lg border border-gray-200 px-3 py-2">
          <View className="flex-row items-center">
            <ArrowLeft size={15} color="#4b5563" />
            <Text className="ml-1 text-xs font-semibold text-gray-700">Back</Text>
          </View>
        </TouchableOpacity>
        <View className="ml-3">
          <Text className="text-xl font-bold text-gray-900">Check-In</Text>
          <Text className="text-xs text-gray-500">{event?.title || "Event"}</Text>
        </View>
      </View>

      <View className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3">
        <View className="flex-row items-center">
          <QrCode size={16} color="#1d4ed8" />
          <Text className="ml-2 text-sm font-semibold text-gray-900">Camera Scanner</Text>
        </View>

        {permission?.granted ? (
          <View className="mt-3 h-72 overflow-hidden rounded-xl border border-gray-200">
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={onBarcodeScanned}
            />
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => void requestPermission()}
            className="mt-3 rounded-xl border border-blue-300 py-3"
          >
            <Text className="text-center text-sm font-semibold text-blue-700">Enable Camera Access</Text>
          </TouchableOpacity>
        )}

        <View className="mt-3 flex-row gap-2">
          <View className="flex-1 rounded-xl border border-gray-200 px-3 py-2 bg-white">
            <TextInput
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="Manual QR code input"
              autoCapitalize="none"
              className="text-gray-900"
            />
          </View>
          <TouchableOpacity
            onPress={() => void submitScan(manualCode)}
            disabled={scanPending || !manualCode.trim()}
            className={`rounded-xl px-4 py-2.5 ${scanPending || !manualCode.trim() ? "bg-blue-300" : "bg-blue-600"}`}
          >
            <Text className="font-semibold text-white">{scanPending ? "..." : "Scan"}</Text>
          </TouchableOpacity>
        </View>

        {scanError ? <Text className="mt-2 text-sm text-red-600">{scanError}</Text> : null}
      </View>

      {lastResult ? (
        <View className={`mt-4 rounded-xl border p-3 ${resultToneClass}`}>
          <Text className="text-base font-semibold">{getResultTitle(lastResult)}</Text>
          <Text className="mt-1 text-sm">
            {lastResult.status === "checked_in"
              ? `Welcome, ${lastResult.attendeeName || "guest"}.`
              : lastResult.status === "already_used"
                ? `${lastResult.attendeeName || "This ticket"} was already used.`
                : lastResult.status === "revoked"
                  ? "This ticket has been revoked."
                  : "Invalid ticket code."}
          </Text>
          {lastResult.ticketCode ? <Text className="mt-1 text-xs">Ticket: {lastResult.ticketCode}</Text> : null}
        </View>
      ) : null}

      {canManageStaff && managerBandId ? (
        <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <View className="flex-row items-center">
            <Users size={16} color="#7c3aed" />
            <Text className="ml-2 text-sm font-semibold text-gray-900">Door Staff</Text>
          </View>

          <View className="mt-3 flex-row gap-2">
            <View className="flex-1 rounded-xl border border-gray-200 px-3 py-2 bg-gray-50">
              <TextInput
                value={staffQuery}
                onChangeText={setStaffQuery}
                placeholder="Search users by name"
                autoCapitalize="words"
                className="text-gray-900"
              />
            </View>
            <TouchableOpacity
              onPress={() => void searchUsers()}
              disabled={searchPending || staffQuery.trim().length < 2}
              className={`rounded-xl px-4 py-2.5 ${
                searchPending || staffQuery.trim().length < 2 ? "bg-violet-300" : "bg-violet-600"
              }`}
            >
              <View className="flex-row items-center">
                <Search size={14} color="#ffffff" />
                <Text className="ml-1 text-xs font-semibold text-white">Find</Text>
              </View>
            </TouchableOpacity>
          </View>

          {suggestions.map((user) => (
            <View key={user.userId} className="mt-2 rounded-xl border border-gray-200 p-3">
              <Text className="font-medium text-gray-900">{user.name}</Text>
              <Text className="mt-0.5 text-xs text-gray-500">
                {user.alreadyAssigned ? "Already assigned" : "Eligible"}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  setAssignPendingUserId(user.userId);
                  setStaffError(null);
                  setStaffMessage(null);
                  try {
                    await assignByUserId(user.userId as Id<"users">);
                    setStaffMessage(`${user.name} assigned to check-in.`);
                  } catch (err) {
                    setStaffError(err instanceof Error ? err.message : "Failed to assign staff.");
                  } finally {
                    setAssignPendingUserId(null);
                  }
                }}
                disabled={user.alreadyAssigned || assignPendingUserId === user.userId}
                className={`mt-2 rounded-lg py-2 ${
                  user.alreadyAssigned || assignPendingUserId === user.userId
                    ? "bg-gray-200"
                    : "bg-violet-600"
                }`}
              >
                <View className="flex-row items-center justify-center">
                  <UserPlus size={14} color={user.alreadyAssigned ? "#6b7280" : "#ffffff"} />
                  <Text className={`ml-1 text-xs font-semibold ${user.alreadyAssigned ? "text-gray-600" : "text-white"}`}>
                    {assignPendingUserId === user.userId ? "Assigning..." : "Assign"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ))}

          <Text className="mt-3 text-xs font-semibold uppercase text-gray-500">Current Staff</Text>
          {staffLoading ? (
            <Text className="mt-2 text-sm text-gray-500">Loading staff...</Text>
          ) : staff.length === 0 ? (
            <Text className="mt-2 text-sm text-gray-500">No staff assigned yet.</Text>
          ) : (
            staff.map((member) => (
              <View key={member.userId} className="mt-2 rounded-xl border border-gray-200 p-3">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="font-medium text-gray-900">{member.name}</Text>
                    <Text className="text-xs text-gray-500">
                      Assigned {new Date(member.assignedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      setRemovePendingUserId(member.userId);
                      setStaffError(null);
                      setStaffMessage(null);
                      try {
                        await removeStaff(member.userId as Id<"users">);
                        setStaffMessage(`${member.name} removed from check-in.`);
                      } catch (err) {
                        setStaffError(err instanceof Error ? err.message : "Failed to remove staff.");
                      } finally {
                        setRemovePendingUserId(null);
                      }
                    }}
                    disabled={removePendingUserId === member.userId}
                    className={`rounded-lg border px-3 py-1.5 ${
                      removePendingUserId === member.userId ? "border-gray-300" : "border-red-300"
                    }`}
                  >
                    <Text className={`text-xs font-semibold ${
                      removePendingUserId === member.userId ? "text-gray-500" : "text-red-700"
                    }`}>
                      {removePendingUserId === member.userId ? "Removing..." : "Remove"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {staffError ? <Text className="mt-3 text-sm text-red-600">{staffError}</Text> : null}
          {staffMessage ? <Text className="mt-3 text-sm text-green-700">{staffMessage}</Text> : null}
        </View>
      ) : null}
    </ScrollView>
  );
}
