"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { X, Search, Users, Clock, Check, Trash2, Crown, UserCheck, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AvatarImage } from "@/components/ui/OptimizedImage";
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

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: totalCount,
      onList: guests.filter((g) => g.rsvpType === "on_list").length,
      attended: guests.filter((g) => g.rsvpType === "attended").length,
    };
  }, [guests, totalCount]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] bg-card border border-border sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Guest List
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                {eventTitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-band/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-band">{stats.onList}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">On List</p>
            </div>
            <div className="bg-success/10 rounded-xl p-3 text-center border border-success/20">
              <p className="text-lg font-bold text-success">{stats.attended}</p>
              <p className="text-[10px] text-success uppercase tracking-wide">Checked In</p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-border space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guests by name..."
              className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band/50 transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {FILTERS.map((option) => {
              const Icon = option.icon;
              const count =
                option.value === "all"
                  ? stats.total
                  : option.value === "on_list"
                  ? stats.onList
                  : stats.attended;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap rounded-xl transition-all border",
                    filter === option.value
                      ? "bg-band text-white border-band shadow-md shadow-band/20"
                      : "bg-card border-border text-muted-foreground hover:border-band/30"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {option.label}
                  <span
                    className={cn(
                      "ml-1 px-1.5 py-0.5 text-[10px] rounded-full",
                      filter === option.value
                        ? "bg-white/20"
                        : "bg-muted"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Alerts */}
          {!canManage && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-500">
              <Crown className="w-4 h-4 flex-shrink-0" />
              Read-only: only owners and admins can manage attendance
            </div>
          )}
          {capReached && (
            <div className="flex items-center gap-2 px-3 py-2 bg-band/10 border border-band/20 rounded-xl text-xs text-band">
              <Users className="w-4 h-4 flex-shrink-0" />
              Showing latest {cap} RSVPs
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500">
              <X className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Guest List */}
        <div className="overflow-y-auto max-h-[50vh] p-2">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="h-16 bg-muted border border-border rounded-xl animate-shimmer"
                />
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                No guests found
              </p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your search or filter
              </p>
            </div>
          ) : (
            <div className="space-y-1">
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
                        "p-3 flex items-center gap-3 rounded-xl transition-colors",
                        guest.rsvpType === "attended"
                          ? "bg-success/5 border border-success/20"
                          : "bg-card border border-border"
                      )}
                    >
                      {/* Avatar */}
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
                              "border-2 rounded-xl",
                              guest.rsvpType === "attended"
                                ? "border-success"
                                : "border-border"
                            )}
                          />
                          {guest.rsvpType === "attended" && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-card flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Info */}
                      <Link
                        href={`/fans/${guest.userId}`}
                        className="flex-1 min-w-0"
                      >
                        <p className="font-medium text-foreground text-sm truncate">
                          {guest.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>RSVP&apos;d {formatGuestDate(guest.rsvpedAt)}</span>
                        </div>
                      </Link>

                      {/* Status & Actions */}
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-1 text-[10px] font-semibold rounded-lg",
                            guest.rsvpType === "attended"
                              ? "bg-success/15 text-success"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {guest.rsvpType === "attended" ? "Checked In" : "On List"}
                        </span>

                        {canManage && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleAttendance(guest)}
                              className={cn(
                                "p-2 rounded-lg transition-colors",
                                guest.rsvpType === "attended"
                                  ? "bg-muted text-muted-foreground hover:bg-muted/80"
                                  : "bg-band/10 text-band hover:bg-band/20",
                                isBusy && "opacity-50 cursor-not-allowed"
                              )}
                              title={
                                guest.rsvpType === "attended"
                                  ? "Mark as not attended"
                                  : "Mark as attended"
                              }
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleRemoveGuest(guest)}
                              className={cn(
                                "p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors",
                                isDeleting && "opacity-50 cursor-not-allowed"
                              )}
                              title="Remove from list"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
