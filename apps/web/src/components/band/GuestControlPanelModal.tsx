"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Search, Users, Clock, Check, Trash2, Crown, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AvatarImage } from "@/components/ui/OptimizedImage";
import { ResponsiveSheetModal } from "@/components/ui/ResponsiveSheetModal";
import { cn } from "@/lib/utils";
import { useEventGuestList } from "@/hooks/useEvents";
import type { GuestFilterType } from "@ear-plug/shared/types";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface GuestControlPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: Id<"events">;
  bandId: Id<"bands">;
  eventTitle: string;
}

const FILTERS: Array<{ label: string; value: GuestFilterType; icon: React.ElementType }> = [
  { label: "All Guests", value: "all", icon: Users },
  { label: "On List", value: "on_list", icon: Clock },
  { label: "Checked In", value: "attended", icon: UserCheck },
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
  bandId,
  eventTitle,
}: GuestControlPanelModalProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GuestFilterType>("all");
  const [activeRsvpId, setActiveRsvpId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    guests,
    capReached,
    cap,
    counts,
    totalCount,
    canManage,
    isLoading,
    setGuestAttendance,
    removeGuestRsvp,
  } = useEventGuestList(
    isOpen ? eventId : undefined,
    isOpen ? bandId : undefined,
    { rsvpType: filter, search }
  );

  const isEmpty = !isLoading && guests.length === 0;

  const handleToggleAttendance = async (guest: (typeof guests)[number]) => {
    if (!canManage) return;
    setError(null);
    setActiveRsvpId(guest.rsvpId);
    try {
      await setGuestAttendance({
        eventId,
        bandId,
        rsvpId: guest.rsvpId as Id<"rsvps">,
        attended: guest.rsvpType !== "attended",
      });
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Failed to update attendance"
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
    setDeletingId(guest.rsvpId);
    try {
      await removeGuestRsvp({
        eventId,
        bandId,
        rsvpId: guest.rsvpId as Id<"rsvps">,
      });
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Failed to remove RSVP"
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ResponsiveSheetModal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="guest-control-panel-title"
      panelClassName="sm:max-w-2xl"
    >
      <div className="border-b border-border bg-card/95 p-4 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="guest-control-panel-title"
              className="text-lg font-bold text-foreground"
            >
              Guest List
            </h2>
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {eventTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-xl border border-border bg-muted p-2 text-muted-foreground transition-colors hover:border-band/30 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

      </div>

      <div className="space-y-3 border-b border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guests by name..."
            className="w-full rounded-xl border border-border bg-muted py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-band/50 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          {FILTERS.map((option) => {
            const Icon = option.icon;
            const count =
              option.value === "all"
                ? counts.total
                : option.value === "on_list"
                  ? counts.onList
                  : counts.attended;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={cn(
                  "flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center transition-all sm:min-h-0 sm:w-auto sm:flex-row sm:gap-1.5 sm:px-3 sm:py-2",
                  filter === option.value
                    ? "border-band bg-band text-white shadow-md shadow-band/20"
                    : "border-border bg-card text-muted-foreground hover:border-band/30"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 text-[10px] font-medium leading-tight sm:text-xs">
                  {option.label}
                </span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    filter === option.value ? "bg-white/20" : "bg-muted"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {!canManage && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            <Crown className="h-4 w-4 flex-shrink-0" />
            Read-only: only owners and admins can manage attendance
          </div>
        )}
        {capReached && (
          <div className="flex items-center gap-2 rounded-xl border border-band/20 bg-band/10 px-3 py-2 text-xs text-band">
            <Users className="h-4 w-4 flex-shrink-0" />
            Showing latest {cap} RSVPs
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-500">
            <X className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {capReached && totalCount > counts.total ? (
          <p className="text-[11px] text-muted-foreground">
            Event has {totalCount} total RSVPs. Attendance tools below show the latest {cap}.
          </p>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="h-24 rounded-2xl border border-border bg-muted animate-shimmer"
              />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mb-1 text-sm font-medium text-foreground">
              No guests found
            </p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search or filter
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {guests.map((guest) => {
                const isBusy = activeRsvpId === guest.rsvpId;
                const isDeleting = deletingId === guest.rsvpId;

                return (
                  <motion.div
                    key={guest.rsvpId}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={cn(
                      "rounded-2xl border p-3.5 transition-colors",
                      guest.rsvpType === "attended"
                        ? "border-success/20 bg-success/5"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <Link
                        href={`/fans/${guest.userId}`}
                        className="flex-shrink-0"
                      >
                        <div className="relative">
                          <AvatarImage
                            src={guest.avatar}
                            alt={guest.name}
                            fallbackText={guest.name}
                            size={44}
                            className={cn(
                              "rounded-xl border-2",
                              guest.rsvpType === "attended"
                                ? "border-success"
                                : "border-border"
                            )}
                          />
                          {guest.rsvpType === "attended" ? (
                            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-success">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          ) : null}
                        </div>
                      </Link>

                      <Link
                        href={`/fans/${guest.userId}`}
                        className="min-w-0 flex-1"
                      >
                        <p className="truncate text-sm font-semibold text-foreground">
                          {guest.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="min-w-0">
                            RSVP&apos;d {formatGuestDate(guest.rsvpedAt)}
                          </span>
                        </div>
                      </Link>
                    </div>

                    <div
                      className={cn(
                        "mt-3 flex items-center gap-3 border-t pt-3",
                        guest.rsvpType === "attended"
                          ? "border-success/15"
                          : "border-border/70",
                        canManage ? "justify-between" : "justify-start"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold  tracking-[0.14em]",
                          guest.rsvpType === "attended"
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {guest.rsvpType === "attended" ? "Checked In" : "On List"}
                      </span>

                      {canManage ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleAttendance(guest)}
                            className={cn(
                              "touch-target flex items-center justify-center rounded-lg p-2 transition-colors",
                              guest.rsvpType === "attended"
                                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                                : "bg-band/10 text-band hover:bg-band/20",
                              isBusy && "cursor-not-allowed opacity-50"
                            )}
                            title={
                              guest.rsvpType === "attended"
                                ? "Mark as not attended"
                                : "Mark as attended"
                            }
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleRemoveGuest(guest)}
                            className={cn(
                              "touch-target flex items-center justify-center rounded-lg bg-red-500/10 p-2 text-red-500 transition-colors hover:bg-red-500/20",
                              isDeleting && "cursor-not-allowed opacity-50"
                            )}
                            title="Remove from list"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </ResponsiveSheetModal>
  );
}
