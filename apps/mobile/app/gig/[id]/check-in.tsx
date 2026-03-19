import {
  ActionButton,
  AppScreen,
  EmptyState,
  HeroHeader,
  MiniBadge,
  SectionCard,
  SectionTitle,
} from "@/components/ui/AppPrimitives";
import { useProfileContext } from "@/context/ProfileContext";
import { useEvent, useEventCheckinAccess, useEventCheckinStaff, useEventTicketScanner } from "@/hooks/useEvents";
import type { EventCheckinAssignableUser, EventTicketScanResult } from "@ear-plug/shared/types";
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Search, UserPlus } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import type { Id } from "../../../../../convex/_generated/dataModel";

function getResultTitle(result: EventTicketScanResult | null): string {
  if (!result) return "";
  if (result.status === "checked_in") return "Checked In";
  if (result.status === "already_used") return "Already Used";
  if (result.status === "revoked") return "Revoked";
  return "Invalid";
}

function getResultTone(result: EventTicketScanResult | null): "success" | "warning" | "danger" | "neutral" {
  if (!result) return "neutral";
  if (result.status === "checked_in") return "success";
  if (result.status === "already_used") return "warning";
  if (result.status === "revoked") return "danger";
  return "neutral";
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
      <AppScreen>
        <SectionCard tone="band">
          <Text className="text-sm text-slate-500">Loading check-in access...</Text>
        </SectionCard>
      </AppScreen>
    );
  }

  if (!canScan) {
    return (
      <AppScreen>
        <EmptyState
          tone="band"
          title="Access Required"
          message="Only event managers or assigned door staff can scan tickets."
          action={<ActionButton label="Back to Event" tone="band" onPress={() => router.replace(`/gig/${eventId}`)} />}
        />
      </AppScreen>
    );
  }

  const tone = getResultTone(lastResult);
  const resultToneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <AppScreen
      scroll
      header={
        <HeroHeader
          title="Check-In"
          subtitle={event?.title || "Event"}
          eyebrow="Door Staff"
          tone="band"
          action={
            <TouchableOpacity onPress={() => router.back()} className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
              <View className="flex-row items-center gap-2">
                <ArrowLeft size={14} color="#334155" />
                <Text className="text-xs font-semibold text-slate-700">Back</Text>
              </View>
            </TouchableOpacity>
          }
        >
          <SectionCard tone="band">
            <View className="flex-row flex-wrap gap-2">
              <MiniBadge label={canManageStaff ? "Manager access" : "Scanner access"} tone="band" />
              {managerBandId ? <MiniBadge label="Staff controls enabled" tone="success" /> : null}
            </View>
          </SectionCard>
        </HeroHeader>
      }
    >
      <View className="gap-4">
        <SectionCard tone="band">
          <SectionTitle title="Camera Scanner" subtitle="Live QR scan plus manual fallback, adapted from the web check-in flow." />

          {permission?.granted ? (
            <View className="mt-1 h-72 overflow-hidden rounded-[24px] border border-slate-200">
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={onBarcodeScanned}
              />
            </View>
          ) : (
            <ActionButton label="Enable Camera Access" tone="band" onPress={() => void requestPermission()} />
          )}

          <View className="mt-4 flex-row gap-2">
            <View className="flex-1 rounded-[18px] border border-slate-200 bg-white px-4 py-3">
              <TextInput
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Manual QR code input"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                className="text-slate-900"
              />
            </View>
            <View className="w-28">
              <ActionButton label={scanPending ? "..." : "Scan"} tone="band" disabled={scanPending || !manualCode.trim()} onPress={() => void submitScan(manualCode)} />
            </View>
          </View>

          {scanError ? <Text className="mt-3 text-sm text-red-600">{scanError}</Text> : null}
        </SectionCard>

        {lastResult ? (
          <View className={`rounded-[24px] border p-4 ${resultToneClass}`}>
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
            {lastResult.ticketCode ? <Text className="mt-2 text-xs">Ticket: {lastResult.ticketCode}</Text> : null}
          </View>
        ) : null}

        {canManageStaff && managerBandId ? (
          <SectionCard>
            <SectionTitle title="Door Staff" subtitle="Search assignable users, grant access, and revoke it from the same screen." />

            <View className="flex-row gap-2">
              <View className="flex-1 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                <TextInput
                  value={staffQuery}
                  onChangeText={setStaffQuery}
                  placeholder="Search users by name"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="words"
                  className="text-slate-900"
                />
              </View>
              <View className="w-24">
                <ActionButton
                  label="Find"
                  tone="band"
                  disabled={searchPending || staffQuery.trim().length < 2}
                  onPress={() => void searchUsers()}
                  icon={<Search size={14} color="#ffffff" />}
                />
              </View>
            </View>

            {suggestions.length > 0 ? (
              <View className="mt-4 gap-3">
                {suggestions.map((user) => (
                  <SectionCard key={user.userId} tone={user.alreadyAssigned ? "neutral" : "band"}>
                    <Text className="text-sm font-semibold text-slate-900">{user.name}</Text>
                    <Text className="mt-1 text-xs text-slate-500">
                      {user.alreadyAssigned ? "Already assigned" : "Eligible"}
                    </Text>
                    <View className="mt-3">
                      <ActionButton
                        label={assignPendingUserId === user.userId ? "Assigning..." : "Assign"}
                        tone="band"
                        disabled={user.alreadyAssigned || assignPendingUserId === user.userId}
                        icon={<UserPlus size={14} color="#ffffff" />}
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
                      />
                    </View>
                  </SectionCard>
                ))}
              </View>
            ) : null}

            <View className="mt-5">
              <SectionTitle title="Current Staff" subtitle="Existing staff assignments for this event." />
              {staffLoading ? (
                <Text className="text-sm text-slate-500">Loading staff...</Text>
              ) : staff.length === 0 ? (
                <Text className="text-sm text-slate-500">No staff assigned yet.</Text>
              ) : (
                <View className="gap-3">
                  {staff.map((member) => (
                    <SectionCard key={member.userId} tone="neutral">
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-slate-900">{member.name}</Text>
                          <Text className="mt-1 text-xs text-slate-500">
                            Assigned {new Date(member.assignedAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <View className="w-28">
                          <ActionButton
                            label={removePendingUserId === member.userId ? "Removing..." : "Remove"}
                            variant="danger"
                            disabled={removePendingUserId === member.userId}
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
                          />
                        </View>
                      </View>
                    </SectionCard>
                  ))}
                </View>
              )}
            </View>

            {staffError ? <Text className="mt-4 text-sm text-red-600">{staffError}</Text> : null}
            {staffMessage ? <Text className="mt-4 text-sm text-emerald-700">{staffMessage}</Text> : null}
          </SectionCard>
        ) : null}
      </View>
    </AppScreen>
  );
}
