"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { X, Search, Users, Clock, Check, Trash2, Crown, UserCheck, ChevronRight } from "lucide-react";
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
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                {eventTitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="touch-target rounded-xl border border-border bg-muted p-2 text-muted-foreground transition-colors hover:text-foreground hover:border-band/30"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-lg font-bold text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-lg font-bold text-band">{stats.onList}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">On List</p>
            </div>
            <div className="col-span-2 rounded-xl border border-success/20 bg-success/10 p-3 text-center sm:col-span-1">
              <p className="text-lg font-bold text-success">{stats.attended}</p>
              <p className="text-[10px] text-success uppercase tracking-wide">Checked In</p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="border-b border-border p-4 space-y-3">
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
        <div className="flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3">
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
                        "rounded-xl p-3 transition-colors",
                        guest.rsvpType === "attended"
                          ? "bg-success/5 border border-success/20"
                          : "bg-card border border-border"
                      )}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </div>
                              ) : null}
                            </div>
                          </Link>

                          <Link
                            href={`/fans/${guest.userId}`}
                            className="min-w-0 flex-1"
                          >
                            <p className="truncate text-sm font-medium text-foreground">
                              {guest.name}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>RSVP&apos;d {formatGuestDate(guest.rsvpedAt)}</span>
                            </div>
                          </Link>
                        </div>

                      <div className="flex flex-col gap-2 sm:items-end">
                        <span
                          className={cn(
                            "w-fit rounded-lg px-2 py-1 text-[10px] font-semibold",
                            guest.rsvpType === "attended"
                              ? "bg-success/15 text-success"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {guest.rsvpType === "attended" ? "Checked In" : "On List"}
                        </span>

                          {canManage && (
                          <div className="flex flex-wrap items-center gap-1">
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
