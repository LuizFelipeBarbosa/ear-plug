"use client";

import { useState } from "react";
import { useFanBookings } from "@/hooks/useBookings";
import { useCurrentUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import {
  Clock,
  Calendar,
  CheckCircle,
  ChevronRight,
  MapPin,
  DollarSign,
  Music,
} from "lucide-react";
import Link from "next/link";
import { formatPrice, formatEventDate, formatEventTime } from "@ear-plug/shared";
import { BOOKING_STATUS_CONFIG } from "@ear-plug/shared";

type TabId = "active" | "upcoming" | "past";

export default function MyBookingsPage() {
  const { user, isFan, isLoading: userLoading } = useCurrentUser();
  const { bookings, isLoading: bookingsLoading } = useFanBookings();
  const [activeTab, setActiveTab] = useState<TabId>("active");

  const isLoading = userLoading || bookingsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-lime animate-pulse-lime" />
        </div>
      </div>
    );
  }

  if (!isFan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight mb-2">Fans Only</h1>
          <p className="text-zinc-400">
            This page is for fans to manage their band bookings.
          </p>
        </div>
      </div>
    );
  }

  const now = Date.now();

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter((booking) => {
    switch (activeTab) {
      case "active":
        return ["pending", "negotiating", "accepted", "deposit_paid"].includes(
          booking.status
        );
      case "upcoming":
        return (
          booking.status === "confirmed" && booking.eventDateTime > now
        );
      case "past":
        return (
          booking.status === "completed" ||
          (booking.status === "confirmed" && booking.eventDateTime < now) ||
          booking.status === "cancelled" ||
          booking.status === "rejected" ||
          booking.status === "expired"
        );
      default:
        return false;
    }
  });

  // Count for badges
  const activeCounts = bookings.filter((b) =>
    ["pending", "negotiating", "accepted", "deposit_paid"].includes(b.status)
  ).length;

  const upcomingCount = bookings.filter(
    (b) => b.status === "confirmed" && b.eventDateTime > now
  ).length;

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "active", label: "Active", count: activeCounts },
    { id: "upcoming", label: "Upcoming", count: upcomingCount },
    { id: "past", label: "Past" },
  ];

  return (
    <div className="min-h-screen bg-night pb-24">
      {/* Header - Brutalist */}
      <div className="sticky top-0 z-40 bg-night-secondary border-b-2 border-lime/20">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">My Bookings</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Track your band booking requests
          </p>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-1 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 font-bold uppercase tracking-wider text-xs transition-colors border-2",
                activeTab === tab.id
                  ? "bg-lime text-night border-lime"
                  : "bg-night-tertiary text-zinc-400 border-zinc-800 hover:border-zinc-600"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    "min-w-[20px] h-5 flex items-center justify-center px-1 text-xs",
                    activeTab === tab.id
                      ? "bg-night text-lime"
                      : "bg-lime text-night"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-zinc-800">
            <div className="w-16 h-16 mx-auto mb-4 bg-night-tertiary border-2 border-zinc-800 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium">
              {activeTab === "active" && "No active booking requests"}
              {activeTab === "upcoming" && "No upcoming confirmed bookings"}
              {activeTab === "past" && "No past bookings"}
            </p>
            {activeTab === "active" && (
              <Link
                href="/hire"
                className="inline-block mt-4 text-lime hover:text-lime/80 font-bold uppercase tracking-wider text-sm"
              >
                Browse bands to hire
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""}
            </p>
            {filteredBookings.map((booking) => (
              <BookingCard key={booking._id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface BookingCardProps {
  booking: {
    _id: string;
    eventName: string;
    eventType: string;
    eventDateTime: number;
    eventLocation: string;
    durationHours: number;
    totalPriceInCents: number;
    paidAmountInCents: number;
    depositAmountInCents: number;
    status: string;
    band?: { name: string; image?: string } | null;
  };
}

function BookingCard({ booking }: BookingCardProps) {
  const statusConfig =
    BOOKING_STATUS_CONFIG[booking.status as keyof typeof BOOKING_STATUS_CONFIG];

  // Calculate payment status
  const isDepositDue =
    booking.status === "accepted" && booking.paidAmountInCents === 0;
  const isFinalPaymentDue =
    booking.status === "deposit_paid" &&
    booking.paidAmountInCents < booking.totalPriceInCents;

  return (
    <Link
      href={`/my-bookings/${booking._id}`}
      className="block bg-night-secondary border-2 border-zinc-800 overflow-hidden hover:border-lime/30 transition-colors group"
    >
      {/* Band Image */}
      <div className="flex">
        <div className="w-24 h-24 bg-night flex-shrink-0 border-r-2 border-zinc-800">
          {booking.band?.image ? (
            <img
              src={booking.band.image}
              alt={booking.band.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-8 h-8 text-zinc-700" />
            </div>
          )}
        </div>

        <div className="flex-1 p-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-white font-bold uppercase tracking-tight line-clamp-1">
                {booking.eventName}
              </h3>
              <p className="text-sm text-zinc-400">
                {booking.band?.name || "Band"}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-500 flex-shrink-0" />
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
            <span className="flex items-center gap-1 uppercase tracking-wider">
              <Calendar className="w-3 h-3" />
              {formatEventDate(booking.eventDateTime)}
            </span>
            <span className="flex items-center gap-1 uppercase tracking-wider">
              <Clock className="w-3 h-3" />
              {booking.durationHours}h
            </span>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-3 py-2 border-t-2 border-zinc-800 flex items-center justify-between">
        <span
          className={cn(
            "px-2 py-1 text-xs font-bold uppercase tracking-wider",
            statusConfig?.bgColor,
            statusConfig?.color
          )}
        >
          {statusConfig?.label || booking.status}
        </span>

        <div className="flex items-center gap-2">
          {(isDepositDue || isFinalPaymentDue) && (
            <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
              Payment required
            </span>
          )}
          <span className="text-sm text-lime font-bold">
            {formatPrice(booking.totalPriceInCents)}
          </span>
        </div>
      </div>
    </Link>
  );
}
