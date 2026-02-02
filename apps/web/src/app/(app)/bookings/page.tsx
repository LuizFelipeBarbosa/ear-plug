"use client";

import { useState } from "react";
import { useCurrentUser } from "@/hooks/useUser";
import { useBandBookings, useBookingActions } from "@/hooks/useBookings";
import { useBandListing } from "@/hooks/useBandListing";
import { useCurrentBand } from "@/hooks/useBand";
import { cn } from "@/lib/utils";
import {
  Clock,
  Calendar,
  CheckCircle,
  Settings,
  ChevronRight,
  MapPin,
  Users,
  DollarSign,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { formatPrice, formatEventDate, formatEventTime } from "@ear-plug/shared";
import { BOOKING_STATUS_CONFIG } from "@ear-plug/shared";

type TabId = "requests" | "upcoming" | "past" | "settings";

export default function BookingsPage() {
  const { user, isMusician, isLoading: userLoading } = useCurrentUser();
  const { band } = useCurrentBand();
  const { bookings, counts, isLoading: bookingsLoading } = useBandBookings();
  const { listing, isLoading: listingLoading } = useBandListing();
  const { accept, reject } = useBookingActions();
  const [activeTab, setActiveTab] = useState<TabId>("requests");

  const isLoading = userLoading || bookingsLoading || listingLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-lime animate-pulse-lime" />
        </div>
      </div>
    );
  }

  if (!isMusician) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night p-6">
        <div className="text-center">
          <h1 className="text-2xl font-display text-white mb-2">Musicians Only</h1>
          <p className="text-zinc-400">This page is for musicians to manage their bookings.</p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "requests", label: "Requests", icon: <Clock className="w-4 h-4" />, count: counts.pending },
    { id: "upcoming", label: "Upcoming", icon: <Calendar className="w-4 h-4" />, count: counts.upcoming },
    { id: "past", label: "Past", icon: <CheckCircle className="w-4 h-4" />, count: counts.past },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter((booking) => {
    const now = Date.now();
    switch (activeTab) {
      case "requests":
        return booking.status === "pending" || booking.status === "negotiating";
      case "upcoming":
        return (
          ["accepted", "deposit_paid", "confirmed"].includes(booking.status) &&
          booking.eventDateTime > now
        );
      case "past":
        return (
          booking.status === "completed" ||
          (booking.status === "confirmed" && booking.eventDateTime < now)
        );
      default:
        return false;
    }
  });

  return (
    <div className="min-h-screen bg-night pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-night/95 backdrop-blur-lg border-b border-lime/10">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-display text-white">Bookings</h1>
          {band && (
            <p className="text-sm text-zinc-400 mt-1">{band.name}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-1 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeTab === tab.id
                  ? "bg-lime text-night"
                  : "bg-night-secondary text-zinc-400 hover:text-white"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    "min-w-[20px] h-5 rounded-full text-xs flex items-center justify-center",
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
        {activeTab === "settings" ? (
          <ListingSettings listing={listing} band={band} />
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-night-secondary flex items-center justify-center">
              <Calendar className="w-8 h-8 text-zinc-500" />
            </div>
            <p className="text-zinc-400">
              {activeTab === "requests" && "No pending booking requests"}
              {activeTab === "upcoming" && "No upcoming bookings"}
              {activeTab === "past" && "No past bookings"}
            </p>
            {activeTab === "requests" && !listing && (
              <p className="text-sm text-zinc-500 mt-2">
                Create a listing to start receiving booking requests
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking._id}
                booking={booking}
                onAccept={activeTab === "requests" ? () => accept({ bookingId: booking._id }) : undefined}
                onReject={activeTab === "requests" ? (reason) => reject({ bookingId: booking._id, reason }) : undefined}
              />
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
    guestCount?: number;
    totalPriceInCents: number;
    status: string;
    fan?: { name: string; avatar?: string } | null;
  };
  onAccept?: () => void;
  onReject?: (reason?: string) => void;
}

function BookingCard({ booking, onAccept, onReject }: BookingCardProps) {
  const statusConfig = BOOKING_STATUS_CONFIG[booking.status as keyof typeof BOOKING_STATUS_CONFIG];

  return (
    <Link
      href={`/bookings/${booking._id}`}
      className="block bg-night-secondary rounded-xl p-4 border border-lime/10 hover:border-lime/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-medium">{booking.eventName}</h3>
          <p className="text-sm text-zinc-400 capitalize">{booking.eventType.replace("_", " ")}</p>
        </div>
        <span
          className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            statusConfig?.bgColor,
            statusConfig?.color
          )}
        >
          {statusConfig?.label || booking.status}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-zinc-400">
          <Calendar className="w-4 h-4" />
          <span>
            {formatEventDate(booking.eventDateTime)} at {formatEventTime(booking.eventDateTime)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <MapPin className="w-4 h-4" />
          <span>{booking.eventLocation}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <Clock className="w-4 h-4" />
          <span>{booking.durationHours} hours</span>
        </div>
        {booking.guestCount && (
          <div className="flex items-center gap-2 text-zinc-400">
            <Users className="w-4 h-4" />
            <span>{booking.guestCount} guests</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-lime">
          <DollarSign className="w-4 h-4" />
          <span className="font-medium">{formatPrice(booking.totalPriceInCents)}</span>
        </div>
      </div>

      {booking.fan && (
        <div className="mt-3 pt-3 border-t border-lime/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {booking.fan.avatar ? (
              <img
                src={booking.fan.avatar}
                alt={booking.fan.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-lime/20 flex items-center justify-center text-lime text-sm font-medium">
                {booking.fan.name.charAt(0)}
              </div>
            )}
            <span className="text-sm text-zinc-300">{booking.fan.name}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-500" />
        </div>
      )}

      {onAccept && onReject && (
        <div className="mt-3 pt-3 border-t border-lime/10 flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              onAccept();
            }}
            className="flex-1 py-2 px-4 bg-lime text-night font-medium rounded-lg hover:bg-lime/90 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onReject();
            }}
            className="flex-1 py-2 px-4 bg-night-secondary text-zinc-300 font-medium rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors"
          >
            Decline
          </button>
        </div>
      )}
    </Link>
  );
}

interface ListingSettingsProps {
  listing: ReturnType<typeof useBandListing>["listing"];
  band: { _id: string; name: string } | null | undefined;
}

function ListingSettings({ listing, band }: ListingSettingsProps) {
  if (!listing) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-night-secondary flex items-center justify-center">
          <Settings className="w-8 h-8 text-zinc-500" />
        </div>
        <h2 className="text-xl font-display text-white mb-2">No Listing Yet</h2>
        <p className="text-zinc-400 mb-6">
          Create a listing to start receiving booking requests from fans
        </p>
        <Link
          href="/bookings/listing/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-lime text-night font-medium rounded-full hover:bg-lime/90 transition-colors"
        >
          Create Listing
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Listing Status Card */}
      <div className="bg-night-secondary rounded-xl p-4 border border-lime/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white">Your Listing</h2>
          <span
            className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              listing.status === "active"
                ? "bg-green-100 text-green-600"
                : listing.status === "paused"
                  ? "bg-yellow-100 text-yellow-600"
                  : "bg-gray-100 text-gray-600"
            )}
          >
            {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
          </span>
        </div>

        <h3 className="text-white font-medium mb-2">{listing.title}</h3>
        {listing.description && (
          <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{listing.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-zinc-500">Base Rate</span>
            <p className="text-white font-medium">
              {formatPrice(listing.baseHourlyRate)}/hr
            </p>
          </div>
          <div>
            <span className="text-zinc-500">Min Hours</span>
            <p className="text-white font-medium">{listing.minimumHours} hours</p>
          </div>
          <div>
            <span className="text-zinc-500">Deposit</span>
            <p className="text-white font-medium">{listing.depositPercentage}%</p>
          </div>
          <div>
            <span className="text-zinc-500">Event Types</span>
            <p className="text-white font-medium">{listing.eventTypes.length} types</p>
          </div>
        </div>

        <Link
          href="/bookings/listing/edit"
          className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 bg-night text-white font-medium rounded-lg border border-lime/20 hover:border-lime/40 transition-colors"
        >
          Edit Listing
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Availability Section */}
      <div className="bg-night-secondary rounded-xl p-4 border border-lime/10">
        <h2 className="text-lg font-medium text-white mb-4">Availability</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Set your available dates so fans know when they can book you
        </p>
        <Link
          href="/bookings/availability"
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-night text-white font-medium rounded-lg border border-lime/20 hover:border-lime/40 transition-colors"
        >
          Manage Availability
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-night-secondary rounded-xl p-4 border border-lime/10">
        <h2 className="text-lg font-medium text-white mb-4">Quick Actions</h2>
        <div className="space-y-2">
          {listing.status === "active" ? (
            <button className="w-full py-2 px-4 text-left text-zinc-300 hover:text-white hover:bg-night rounded-lg transition-colors">
              Pause Listing
            </button>
          ) : listing.status === "paused" ? (
            <button className="w-full py-2 px-4 text-left text-zinc-300 hover:text-white hover:bg-night rounded-lg transition-colors">
              Activate Listing
            </button>
          ) : null}
          <button className="w-full py-2 px-4 text-left text-red-400 hover:text-red-300 hover:bg-night rounded-lg transition-colors">
            Archive Listing
          </button>
        </div>
      </div>
    </div>
  );
}
