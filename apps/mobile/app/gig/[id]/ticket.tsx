import {
  ActionButton,
  AppScreen,
  EmptyState,
  HeroHeader,
  MiniBadge,
  SectionCard,
  SectionTitle,
} from "@/components/ui/AppPrimitives";
import { useMyEventTicket } from "@/hooks/useEvents";
import { formatEventDate, formatEventTime } from "@ear-plug/shared/constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Clock, MapPin, QrCode as QrCodeIcon, Share2, Ticket } from "lucide-react-native";
import { useState } from "react";
import { Share, Text, TouchableOpacity, View } from "react-native";
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
      <AppScreen>
        <SectionCard tone="fan">
          <Text className="text-sm text-slate-500">Loading ticket...</Text>
        </SectionCard>
      </AppScreen>
    );
  }

  if (!ticket) {
    return (
      <AppScreen>
        <EmptyState
          tone="fan"
          title="Ticket unavailable"
          message="RSVP to this event first, then open your ticket from the event page."
          action={<ActionButton label="Back to Event" tone="fan" onPress={() => router.replace(`/gig/${eventId}`)} />}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      scroll
      header={
        <HeroHeader
          title="Event Ticket"
          subtitle="Present this at the venue entrance for one-time check-in."
          eyebrow="Fan Ticket"
          tone="fan"
          action={
            <TouchableOpacity onPress={() => router.back()} className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
              <View className="flex-row items-center gap-2">
                <ArrowLeft size={14} color="#334155" />
                <Text className="text-xs font-semibold text-slate-700">Back</Text>
              </View>
            </TouchableOpacity>
          }
        >
          <SectionCard tone="fan">
            <Text className="text-2xl font-bold text-slate-950">{ticket.eventTitle}</Text>
            <View className="mt-4 flex-row flex-wrap gap-2">
              <MiniBadge label={ticket.ticket?.status ?? "pending"} tone={ticket.ticket?.status === "active" ? "success" : ticket.ticket?.status === "used" ? "warning" : "danger"} />
              {ticket.ticket?.ticketCode ? <MiniBadge label={ticket.ticket.ticketCode} tone="neutral" /> : null}
            </View>
          </SectionCard>
        </HeroHeader>
      }
    >
      <View className="gap-4">
        <SectionCard>
          <SectionTitle title="Ticket Details" subtitle="Mobile-native ticket presentation using the same backend lifecycle as web." />
          <View className="gap-3">
            <DetailRow
              icon={<Clock size={15} color="#64748b" />}
              label={`${formatEventDate(ticket.eventDateTime)} • ${formatEventTime(ticket.eventDateTime)}`}
            />
            <DetailRow
              icon={<MapPin size={15} color="#64748b" />}
              label={ticket.venue ? `${ticket.venue.name}${ticket.venue.city ? ` • ${ticket.venue.city}` : ""}` : "Venue TBD"}
            />
            <DetailRow icon={<Ticket size={15} color="#64748b" />} label={ticket.attendeeName} />
          </View>
        </SectionCard>

        <SectionCard tone="fan">
          <SectionTitle title="Entry QR" subtitle="One-time QR validation at the door." />
          <View className="items-center">
            {ticket.requiresTicketBootstrap ? (
              <>
                <Text className="text-sm text-slate-600">Preparing your ticket...</Text>
                <View className="mt-4 w-full">
                  <ActionButton
                    label={pendingEnsure ? "Preparing..." : "Generate Ticket"}
                    tone="fan"
                    disabled={pendingEnsure}
                    onPress={() => void handleEnsureTicket()}
                  />
                </View>
              </>
            ) : lifecycleStatus === "active" && qrValue ? (
              <>
                <View className="rounded-[28px] border border-dashed border-blue-200 bg-white p-5">
                  <QRCode value={qrValue} size={210} />
                </View>
                <Text className="mt-4 text-sm font-semibold text-slate-900">Code: {ticket.ticket?.ticketCode}</Text>
                <Text className="mt-1 text-xs text-slate-500">Show this at the door for check-in.</Text>
              </>
            ) : lifecycleStatus === "used" ? (
              <StatusBlock title="Ticket already used" subtitle="This ticket was already checked in." tone="warning" />
            ) : lifecycleStatus === "revoked" ? (
              <StatusBlock title="Ticket revoked" subtitle="This ticket is no longer valid for entry." tone="danger" />
            ) : (
              <StatusBlock title="Ticket unavailable" subtitle="Your ticket is not ready yet." tone="neutral" />
            )}
          </View>
        </SectionCard>

        {error ? (
          <SectionCard tone="danger">
            <Text className="text-sm text-red-700">{error}</Text>
          </SectionCard>
        ) : null}

        <ActionButton
          label="Share Ticket Details"
          variant="secondary"
          onPress={() => void handleShareTicket()}
          icon={<Share2 size={16} color="#334155" />}
        />

        <View className="flex-row items-center justify-center gap-2 pb-4">
          <QrCodeIcon size={12} color="#64748b" />
          <Text className="text-xs text-slate-500">One-time QR validation at entry</Text>
        </View>
      </View>
    </AppScreen>
  );
}

function DetailRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View className="flex-row items-center gap-3">
      {icon}
      <Text className="text-sm text-slate-700">{label}</Text>
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
  tone: "warning" | "danger" | "neutral";
}) {
  const toneClasses =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "danger"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <View className={`w-full rounded-[24px] border p-4 ${toneClasses}`}>
      <Text className="text-center text-base font-semibold">{title}</Text>
      <Text className="mt-1 text-center text-sm">{subtitle}</Text>
    </View>
  );
}
