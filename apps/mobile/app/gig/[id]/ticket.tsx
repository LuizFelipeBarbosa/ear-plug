import { useMyEventTicket } from "@/hooks/useEvents";
import { formatEventDate, formatEventTime } from "@ear-plug/shared/constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Clock, MapPin, QrCode as QrCodeIcon, Share2, Ticket } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Share, Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function EventTicketScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id as Id<"events">;
  const { ticket, isLoading, ensureTicket } = useMyEventTicket(eventId);
  const [pendingEnsure, setPendingEnsure] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lifecycleStatus = ticket?.ticket?.status;
  const qrValue = ticket?.ticket?.qrValue;

  const handleEnsureTicket = async () => {
    setPendingEnsure(true);
    setError(null);
    try {
      await ensureTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create ticket.");
    } finally {
      setPendingEnsure(false);
    }
  };

  const handleShareTicket = async () => {
    if (!ticket) return;
    await Share.share({
      message: [
        "Ear-Plug Event Ticket",
        ticket.eventTitle,
        `${formatEventDate(ticket.eventDateTime)} • ${formatEventTime(ticket.eventDateTime)}`,
        `Ticket Code: ${ticket.ticket?.ticketCode ?? "Unavailable"}`,
      ].join("\n"),
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="small" color="#2563eb" />
        <Text className="mt-2 text-sm text-gray-500">Loading ticket...</Text>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-xl font-semibold text-gray-900">Ticket unavailable</Text>
        <Text className="mt-2 text-center text-sm text-gray-500">
          RSVP to this event first, then open your ticket from the event page.
        </Text>
        <TouchableOpacity onPress={() => router.replace(`/gig/${eventId}`)} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5">
          <Text className="font-semibold text-white">Back to Event</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white px-4 pb-8 pt-14">
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center self-start rounded-lg border border-gray-200 px-3 py-2">
        <ArrowLeft size={16} color="#4b5563" />
        <Text className="ml-2 text-xs font-semibold text-gray-700">Back</Text>
      </TouchableOpacity>

      <View className="mt-4 rounded-3xl border border-gray-200 bg-gray-50 p-5">
        <View className="flex-row items-center">
          <Ticket size={18} color="#2563eb" />
          <Text className="ml-2 text-base font-semibold text-gray-900">Event Ticket</Text>
        </View>
        <Text className="mt-3 text-2xl font-bold text-gray-900">{ticket.eventTitle}</Text>

        <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <DetailRow
            icon={<Clock size={15} color="#6b7280" />}
            label={`${formatEventDate(ticket.eventDateTime)} • ${formatEventTime(ticket.eventDateTime)}`}
          />
          <DetailRow
            icon={<MapPin size={15} color="#6b7280" />}
            label={
              ticket.venue ? `${ticket.venue.name}${ticket.venue.city ? ` • ${ticket.venue.city}` : ""}` : "Venue TBD"
            }
          />
          <Text className="mt-3 text-xs uppercase text-gray-500">Attendee</Text>
          <Text className="text-sm font-semibold text-gray-900">{ticket.attendeeName}</Text>
        </View>

        <View className="mt-5 items-center rounded-2xl border border-dashed border-gray-300 bg-white p-5">
          {ticket.requiresTicketBootstrap ? (
            <View className="items-center">
              <Text className="text-sm text-gray-600">Preparing your ticket...</Text>
              <TouchableOpacity
                onPress={() => void handleEnsureTicket()}
                disabled={pendingEnsure}
                className={`mt-3 rounded-xl px-4 py-2 ${pendingEnsure ? "bg-blue-300" : "bg-blue-600"}`}
              >
                <Text className="font-semibold text-white">{pendingEnsure ? "Preparing..." : "Generate Ticket"}</Text>
              </TouchableOpacity>
            </View>
          ) : lifecycleStatus === "active" && qrValue ? (
            <>
              <QRCode value={qrValue} size={210} />
              <Text className="mt-3 text-sm font-semibold text-gray-900">Code: {ticket.ticket?.ticketCode}</Text>
              <Text className="mt-1 text-xs text-gray-500">Show this at the door for check-in.</Text>
            </>
          ) : lifecycleStatus === "used" ? (
            <StatusBlock title="Ticket already used" subtitle="This ticket was already checked in." tone="amber" />
          ) : lifecycleStatus === "revoked" ? (
            <StatusBlock title="Ticket revoked" subtitle="This ticket is no longer valid for entry." tone="red" />
          ) : (
            <StatusBlock title="Ticket unavailable" subtitle="Your ticket is not ready yet." tone="gray" />
          )}
        </View>

        {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}

        <TouchableOpacity
          onPress={() => void handleShareTicket()}
          className="mt-4 rounded-xl border border-blue-300 py-3"
        >
          <View className="flex-row items-center justify-center">
            <Share2 size={16} color="#1d4ed8" />
            <Text className="ml-2 text-sm font-semibold text-blue-700">Share Ticket Details</Text>
          </View>
        </TouchableOpacity>

        <View className="mt-3 flex-row items-center justify-center">
          <QrCodeIcon size={12} color="#6b7280" />
          <Text className="ml-1 text-xs text-gray-500">One-time QR validation at entry</Text>
        </View>
      </View>
    </View>
  );
}

function DetailRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View className="flex-row items-center">
      {icon}
      <Text className="ml-2 text-sm text-gray-700">{label}</Text>
    </View>
  );
}

function StatusBlock({
  title,
  subtitle,
  tone,
}: {
  title: string;
  subtitle: string;
  tone: "amber" | "red" | "gray";
}) {
  const toneClasses =
    tone === "amber"
      ? "border-amber-300 bg-amber-50 text-amber-700"
      : tone === "red"
        ? "border-red-300 bg-red-50 text-red-700"
        : "border-gray-300 bg-gray-100 text-gray-700";

  return (
    <View className={`w-full rounded-xl border p-4 ${toneClasses}`}>
      <Text className="text-center text-base font-semibold">{title}</Text>
      <Text className="mt-1 text-center text-sm">{subtitle}</Text>
    </View>
  );
}
