"use client";

import { useMemo, useState } from "react";
import { X, Search, Users, Clock, Check, Trash2 } from "lucide-react";
import { AvatarImage } from "@/components/ui/OptimizedImage";
import { cn } from "@/lib/utils";
import { useEventGuestList } from "@/hooks/useEvents";
import type { GuestFilterType } from "@ear-plug/shared/types";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface GuestControlPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: Id<"events">;
  eventTitle: string;
}

const FILTERS: Array<{ label: string; value: GuestFilterType }> = [
  { label: "All", value: "all" },
  { label: "On List", value: "on_list" },
  { label: "Attended", value: "attended" },
];

function formatGuestDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function GuestControlPanelModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
}: GuestControlPanelModalProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GuestFilterType>("all");
  const [activeRsvpId, setActiveRsvpId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    guests,
    capReached,
    cap,
    totalCount,
    canManage,
    isLoading,
    setGuestAttendance,
    removeGuestRsvp,
  } = useEventGuestList(isOpen ? eventId : undefined, {
    rsvpType: filter,
    search,
  });

  const isEmpty = !isLoading && guests.length === 0;
  const modalSubtitle = useMemo(
    () => `${totalCount} guests RSVP'd`,
    [totalCount]
  );

  const handleToggleAttendance = async (guest: (typeof guests)[number]) => {
    if (!canManage) return;
    setError(null);
    setActiveRsvpId(guest.rsvpId);

    try {
      await setGuestAttendance({
        eventId,
        rsvpId: guest.rsvpId as Id<"rsvps">,
        attended: guest.rsvpType !== "attended",
      });
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Failed to update attendance."
      );
    } finally {
      setActiveRsvpId(null);
    }
  };

  const handleRemoveGuest = async (guest: (typeof guests)[number]) => {
    if (!canManage) return;
    const confirmed = window.confirm(
      `Remove ${guest.name} from the RSVP list?`
    );
    if (!confirmed) return;

    setError(null);
    setActiveRsvpId(guest.rsvpId);

    try {
      await removeGuestRsvp({
        eventId,
        rsvpId: guest.rsvpId as Id<"rsvps">,
      });
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Failed to remove RSVP."
      );
    } finally {
      setActiveRsvpId(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl max-h-[88vh] overflow-hidden bg-night border-2 border-zinc-800">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-wide">
              Guest Control Panel
            </h2>
            <p className="text-sm text-zinc-400 mt-1">{eventTitle}</p>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mt-2">
              {modalSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 border-b border-zinc-800 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search guests by name..."
              className="w-full pl-10 pr-3 py-2 bg-night-secondary border border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/50"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={cn(
                  "px-3 py-1.5 border text-xs font-bold uppercase tracking-wider transition-colors",
                  filter === option.value
                    ? "border-lime text-lime bg-lime/10"
                    : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {!canManage && (
            <div className="px-3 py-2 border border-zinc-700 bg-night-secondary text-xs uppercase tracking-wider text-zinc-400">
              Read-only access: only owners and admins can manage attendance.
            </div>
          )}

          {capReached && (
            <div className="px-3 py-2 border border-violet/50 bg-violet/10 text-xs uppercase tracking-wider text-violet">
              Showing latest {cap} RSVPs.
            </div>
          )}

          {error && (
            <div className="px-3 py-2 border border-red-500/40 bg-red-500/10 text-xs uppercase tracking-wider text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="overflow-y-auto max-h-[50vh]">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="h-16 border border-zinc-800 bg-night-secondary animate-shimmer"
                />
              ))}
            </div>
          ) : isEmpty ? (
            <div className="p-8 text-center">
              <Users className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400 uppercase tracking-wider">
                No guests found for this filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {guests.map((guest) => {
                const isBusy = activeRsvpId === guest.rsvpId;
                return (
                  <div
                    key={guest.rsvpId}
                    className="p-4 flex items-center gap-3 justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarImage
                        src={guest.avatar}
                        alt={guest.name}
                        fallbackText={guest.name}
                        size={44}
                        className="border border-zinc-700"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {guest.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] uppercase tracking-wider text-zinc-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatGuestDate(guest.rsvpedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span
                        className={cn(
                          "px-2 py-1 text-[10px] font-bold uppercase tracking-wider border",
                          guest.rsvpType === "attended"
                            ? "border-lime/50 text-lime bg-lime/10"
                            : "border-zinc-700 text-zinc-400 bg-night-secondary"
                        )}
                      >
                        {guest.rsvpType === "attended" ? "Attended" : "On List"}
                      </span>

                      {canManage && (
                        <>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleAttendance(guest)}
                            className={cn(
                              "px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-colors",
                              guest.rsvpType === "attended"
                                ? "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                                : "border-lime/50 text-lime hover:bg-lime/10",
                              isBusy && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <span className="inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              {guest.rsvpType === "attended"
                                ? "Mark on list"
                                : "Mark attended"}
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleRemoveGuest(guest)}
                            className={cn(
                              "px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-red-500/40 text-red-300 hover:bg-red-500/10 transition-colors",
                              isBusy && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <span className="inline-flex items-center gap-1">
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
