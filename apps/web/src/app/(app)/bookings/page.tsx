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
  Music,
  Plus,
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
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight mb-2">Musicians Only</h1>
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
      {/* Header - Brutalist */}
      <div className="sticky top-0 z-40 bg-night-secondary border-b-2 border-lime/20">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Bookings</h1>
          {band && (
            <p className="text-sm text-zinc-400 mt-1">{band.name}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-1 overflow-x-auto pb-2 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 font-bold uppercase tracking-wider text-xs whitespace-nowrap transition-colors border-2",
                activeTab === tab.id
                  ? "bg-lime text-night border-lime"
                  : "bg-night-tertiary text-zinc-400 border-zinc-800 hover:border-zinc-600"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    "min-w-[20px] h-5 flex items-center justify-center px-1",
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
          <div className="text-center py-12 border-2 border-dashed border-zinc-800">
            <div className="w-16 h-16 mx-auto mb-4 bg-night-tertiary border-2 border-zinc-800 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium">
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
      className="block bg-night-secondary border-2 border-zinc-800 p-4 hover:border-lime/30 transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-bold uppercase tracking-tight">{booking.eventName}</h3>
          <p className="text-sm text-zinc-400 capitalize">{booking.eventType.replace("_", " ")}</p>
        </div>
        <span
          className={cn(
            "px-2 py-1 text-xs font-bold uppercase tracking-wider",
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
          <span className="uppercase tracking-wider">
            {formatEventDate(booking.eventDateTime)} at {formatEventTime(booking.eventDateTime)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <MapPin className="w-4 h-4" />
          <span>{booking.eventLocation}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <Clock className="w-4 h-4" />
          <span className="uppercase tracking-wider">{booking.durationHours} hours</span>
        </div>
        {booking.guestCount && (
          <div className="flex items-center gap-2 text-zinc-400">
            <Users className="w-4 h-4" />
            <span className="uppercase tracking-wider">{booking.guestCount} guests</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-lime">
          <DollarSign className="w-4 h-4" />
          <span className="font-bold uppercase tracking-wider">{formatPrice(booking.totalPriceInCents)}</span>
        </div>
      </div>

      {booking.fan && (
        <div className="mt-3 pt-3 border-t-2 border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {booking.fan.avatar ? (
              <img
                src={booking.fan.avatar}
                alt={booking.fan.name}
                className="w-8 h-8 border-2 border-zinc-800"
              />
            ) : (
              <div className="w-8 h-8 bg-lime/20 border-2 border-lime/30 flex items-center justify-center text-lime text-sm font-bold">
                {booking.fan.name.charAt(0)}
              </div>
            )}
            <span className="text-sm text-zinc-300 font-medium">{booking.fan.name}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-500" />
        </div>
      )}

      {onAccept && onReject && (
        <div className="mt-3 pt-3 border-t-2 border-zinc-800 flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              onAccept();
            }}
            className="flex-1 py-2 px-4 bg-lime text-night font-bold uppercase tracking-wider text-xs border-2 border-lime hover:bg-transparent hover:text-lime transition-colors"
          >
            Accept
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onReject();
            }}
            className="flex-1 py-2 px-4 bg-night-tertiary text-zinc-300 font-bold uppercase tracking-wider text-xs border-2 border-zinc-800 hover:border-zinc-600 transition-colors"
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
      <div className="text-center py-12 border-2 border-dashed border-zinc-800">
        <div className="w-16 h-16 mx-auto mb-4 bg-night-tertiary border-2 border-zinc-800 flex items-center justify-center">
          <Settings className="w-8 h-8 text-zinc-600" />
        </div>
        <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-2">No Listing Yet</h2>
        <p className="text-zinc-400 mb-6">
          Create a listing to start receiving booking requests from fans
        </p>
        <Link
          href="/bookings/listing/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-lime text-night font-bold uppercase tracking-wider text-sm border-2 border-lime hover:bg-transparent hover:text-lime transition-all shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1"
        >
          <Plus className="w-4 h-4" />
          Create Listing
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Listing Status Card */}
      <div className="bg-night-secondary border-2 border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-tight">Your Listing</h2>
          <span
            className={cn(
              "px-2 py-1 text-xs font-bold uppercase tracking-wider border-2",
              listing.status === "active"
                ? "bg-lime/20 text-lime border-lime"
                : listing.status === "paused"
                  ? "bg-amber-500/20 text-amber-400 border-amber-400"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
            )}
          >
            {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
          </span>
        </div>

        <h3 className="text-white font-bold uppercase tracking-tight mb-2">{listing.title}</h3>
        {listing.description && (
          <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{listing.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-night-tertiary border border-zinc-800 p-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Base Rate</span>
            <p className="text-white font-bold">
              {formatPrice(listing.baseHourlyRate)}/hr
            </p>
          </div>
          <div className="bg-night-tertiary border border-zinc-800 p-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Min Hours</span>
            <p className="text-white font-bold">{listing.minimumHours} hours</p>
          </div>
          <div className="bg-night-tertiary border border-zinc-800 p-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Deposit</span>
            <p className="text-white font-bold">{listing.depositPercentage}%</p>
          </div>
          <div className="bg-night-tertiary border border-zinc-800 p-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Event Types</span>
            <p className="text-white font-bold">{listing.eventTypes.length} types</p>
          </div>
        </div>

        <Link
          href="/bookings/listing/edit"
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 bg-night-tertiary text-white font-bold uppercase tracking-wider text-sm border-2 border-zinc-800 hover:border-lime transition-colors"
        >
          Edit Listing
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Availability Section */}
      <div className="bg-night-secondary border-2 border-zinc-800 p-4">
        <h2 className="text-lg font-bold text-white uppercase tracking-tight mb-2">Availability</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Set your available dates so fans know when they can book you
        </p>
        <Link
          href="/bookings/availability"
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-night-tertiary text-white font-bold uppercase tracking-wider text-sm border-2 border-zinc-800 hover:border-lime transition-colors"
        >
          Manage Availability
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-night-secondary border-2 border-zinc-800 p-4">
        <h2 className="text-lg font-bold text-white uppercase tracking-tight mb-4">Quick Actions</h2>
        <div className="space-y-2">
          {listing.status === "active" ? (
            <button className="w-full py-3 px-4 text-left text-zinc-300 hover:text-white hover:bg-night-tertiary border-2 border-zinc-800 hover:border-zinc-600 transition-colors font-medium uppercase tracking-wider text-sm">
              Pause Listing
            </button>
          ) : listing.status === "paused" ? (
            <button className="w-full py-3 px-4 text-left text-lime hover:bg-night-tertiary border-2 border-zinc-800 hover:border-lime transition-colors font-bold uppercase tracking-wider text-sm">
              Activate Listing
            </button>
          ) : null}
          <button className="w-full py-3 px-4 text-left text-red-400 hover:text-red-300 hover:bg-night-tertiary border-2 border-zinc-800 hover:border-red-400 transition-colors font-bold uppercase tracking-wider text-sm">
            Archive Listing
          </button>
        </div>
      </div>
    </div>
  );
}
