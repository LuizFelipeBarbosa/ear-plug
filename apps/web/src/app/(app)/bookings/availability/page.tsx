"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBandListing, useBandAvailability } from "@/hooks/useBandListing";
import { useCurrentBand } from "@/hooks/useBand";
import { useCurrentUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import { ArrowLeft, Plus, X, Calendar, Clock, Ban } from "lucide-react";
import Link from "next/link";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

type SlotType = "available" | "blocked";

interface NewSlot {
  type: SlotType;
  date: string;
  startTime: string;
  endTime: string;
}

export default function AvailabilityPage() {
  const router = useRouter();
  const { user, isMusician, isLoading: userLoading } = useCurrentUser();
  const { band, isLoading: bandLoading } = useCurrentBand();
  const { listing, isLoading: listingLoading } = useBandListing();
  const {
    slots,
    isLoading: slotsLoading,
    setAvailability,
    blockDates,
    deleteSlot,
  } = useBandAvailability(band?._id as Id<"bands"> | undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSlot, setNewSlot] = useState<NewSlot>({
    type: "available",
    date: "",
    startTime: "18:00",
    endTime: "23:00",
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const isLoading = userLoading || bandLoading || listingLoading || slotsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-lime animate-pulse-lime" />
        </div>
      </div>
    );
  }

  if (!isMusician || !band) {
    return (
      <div className="min-h-screen bg-night p-6">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>
        <div className="text-center py-12">
          <h1 className="text-2xl font-display text-white mb-2">
            Musicians Only
          </h1>
          <p className="text-zinc-400">
            You need to be a musician with a band to manage availability
          </p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-night p-6">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>
        <div className="text-center py-12">
          <h1 className="text-2xl font-display text-white mb-2">
            Create a Listing First
          </h1>
          <p className="text-zinc-400 mb-6">
            You need to create a marketplace listing before managing availability
          </p>
          <Link
            href="/bookings/listing/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-lime text-night font-bold rounded-xl hover:bg-lime/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Listing
          </Link>
        </div>
      </div>
    );
  }

  const handleAddSlot = async () => {
    if (!newSlot.date || !listing) return;

    setIsSubmitting(true);
    try {
      const dateObj = new Date(newSlot.date);
      const [startHour, startMin] = newSlot.startTime.split(":").map(Number);
      const [endHour, endMin] = newSlot.endTime.split(":").map(Number);

      const startDateTime = new Date(dateObj);
      startDateTime.setHours(startHour, startMin, 0, 0);

      const endDateTime = new Date(dateObj);
      endDateTime.setHours(endHour, endMin, 0, 0);

      // If end time is before start time, assume it's the next day
      if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      if (newSlot.type === "available") {
        await setAvailability({
          bandId: band._id as Id<"bands">,
          listingId: listing._id as Id<"bandListings">,
          slots: [
            {
              startDateTime: startDateTime.getTime(),
              endDateTime: endDateTime.getTime(),
            },
          ],
        });
      } else {
        await blockDates({
          bandId: band._id as Id<"bands">,
          listingId: listing._id as Id<"bandListings">,
          startDateTime: startDateTime.getTime(),
          endDateTime: endDateTime.getTime(),
          reason: "Blocked by band",
        });
      }

      setNewSlot({ type: "available", date: "", startTime: "18:00", endTime: "23:00" });
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to add slot:", error);
      alert("Failed to add slot. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId: Id<"bandAvailability">) => {
    if (!confirm("Are you sure you want to delete this slot?")) return;

    try {
      await deleteSlot({ slotId });
    } catch (error) {
      console.error("Failed to delete slot:", error);
      alert("Failed to delete slot. Please try again.");
    }
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  // Group slots by date
  const slotsByDate = slots.reduce(
    (acc, slot) => {
      const dateKey = new Date(slot.startDateTime).toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(slot);
      return acc;
    },
    {} as Record<string, typeof slots>
  );

  // Sort dates
  const sortedDates = Object.keys(slotsByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // Filter to upcoming dates only
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingDates = sortedDates.filter(
    (date) => new Date(date).getTime() >= today.getTime()
  );

  return (
    <div className="min-h-screen bg-night pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-night/95 backdrop-blur-lg border-b border-lime/10">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link
            href="/bookings?tab=settings"
            className="w-10 h-10 rounded-full bg-night-secondary flex items-center justify-center text-white hover:bg-night transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-medium text-white">Manage Availability</h1>
            <p className="text-sm text-zinc-400">{band.name}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Add Slot Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-3 bg-lime text-night font-bold rounded-xl hover:bg-lime/90 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Availability
          </button>
        )}

        {/* Add Slot Form */}
        {showAddForm && (
          <div className="bg-night-secondary rounded-xl p-4 border border-lime/10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">Add Time Slot</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slot Type */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewSlot((s) => ({ ...s, type: "available" }))}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2",
                    newSlot.type === "available"
                      ? "bg-lime text-night"
                      : "bg-night text-zinc-400 hover:text-white"
                  )}
                >
                  <Calendar className="w-4 h-4" />
                  Available
                </button>
                <button
                  type="button"
                  onClick={() => setNewSlot((s) => ({ ...s, type: "blocked" }))}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2",
                    newSlot.type === "blocked"
                      ? "bg-red-500 text-white"
                      : "bg-night text-zinc-400 hover:text-white"
                  )}
                >
                  <Ban className="w-4 h-4" />
                  Blocked
                </button>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Date *</label>
              <input
                type="date"
                required
                value={newSlot.date}
                onChange={(e) => setNewSlot((s) => ({ ...s, date: e.target.value }))}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white focus:outline-none focus:border-lime/30"
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={newSlot.startTime}
                  onChange={(e) =>
                    setNewSlot((s) => ({ ...s, startTime: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white focus:outline-none focus:border-lime/30"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  value={newSlot.endTime}
                  onChange={(e) =>
                    setNewSlot((s) => ({ ...s, endTime: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white focus:outline-none focus:border-lime/30"
                />
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              {newSlot.type === "available"
                ? "This time slot will be shown to fans looking to book you."
                : "This will block off the time so fans cannot request bookings."}
            </p>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2 bg-night text-zinc-300 font-medium rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSlot}
                disabled={isSubmitting || !newSlot.date}
                className={cn(
                  "flex-1 py-2 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                  newSlot.type === "available"
                    ? "bg-lime text-night hover:bg-lime/90"
                    : "bg-red-500 text-white hover:bg-red-600"
                )}
              >
                {isSubmitting ? "Adding..." : "Add Slot"}
              </button>
            </div>
          </div>
        )}

        {/* Existing Slots */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-white">Your Schedule</h2>

          {upcomingDates.length === 0 ? (
            <div className="bg-night-secondary rounded-xl p-6 border border-lime/10 text-center">
              <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">No upcoming availability set</p>
              <p className="text-sm text-zinc-500 mt-1">
                Add available time slots so fans can book you
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingDates.map((dateKey) => {
                const dateSlots = slotsByDate[dateKey];
                const dateDisplay = new Date(dateKey).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <div
                    key={dateKey}
                    className="bg-night-secondary rounded-xl border border-lime/10 overflow-hidden"
                  >
                    <div className="px-4 py-3 bg-night border-b border-lime/10">
                      <h3 className="font-medium text-white">{dateDisplay}</h3>
                    </div>
                    <div className="divide-y divide-lime/5">
                      {dateSlots
                        .sort((a, b) => a.startDateTime - b.startDateTime)
                        .map((slot) => {
                          const start = formatDateTime(slot.startDateTime);
                          const end = formatDateTime(slot.endDateTime);
                          const isBlocked = slot.status === "blocked";
                          const isBooked = slot.status === "booked";

                          return (
                            <div
                              key={slot._id}
                              className="px-4 py-3 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                    isBooked
                                      ? "bg-violet-500/20 text-violet-400"
                                      : isBlocked
                                        ? "bg-red-500/20 text-red-400"
                                        : "bg-lime/20 text-lime"
                                  )}
                                >
                                  {isBooked ? (
                                    <Calendar className="w-5 h-5" />
                                  ) : isBlocked ? (
                                    <Ban className="w-5 h-5" />
                                  ) : (
                                    <Clock className="w-5 h-5" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-white font-medium">
                                    {start.time} - {end.time}
                                  </p>
                                  <p
                                    className={cn(
                                      "text-sm",
                                      isBooked
                                        ? "text-violet-400"
                                        : isBlocked
                                          ? "text-red-400"
                                          : "text-lime"
                                    )}
                                  >
                                    {isBooked
                                      ? "Booked"
                                      : isBlocked
                                        ? "Blocked"
                                        : "Available"}
                                  </p>
                                </div>
                              </div>
                              {!isBooked && (
                                <button
                                  onClick={() =>
                                    handleDeleteSlot(slot._id as Id<"bandAvailability">)
                                  }
                                  className="text-zinc-500 hover:text-red-400 transition-colors"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="bg-night-secondary rounded-xl p-4 border border-lime/10">
          <h3 className="font-medium text-white mb-2">How Availability Works</h3>
          <ul className="text-sm text-zinc-400 space-y-2">
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-lime mt-1.5 shrink-0" />
              <span>
                <strong className="text-white">Available slots</strong> are shown to
                fans browsing your listing. They can request bookings during these
                times.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <span>
                <strong className="text-white">Blocked slots</strong> prevent any
                booking requests for those times. Use this when you&apos;re unavailable.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 shrink-0" />
              <span>
                <strong className="text-white">Booked slots</strong> are automatically
                created when a booking is confirmed. You cannot delete these.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
