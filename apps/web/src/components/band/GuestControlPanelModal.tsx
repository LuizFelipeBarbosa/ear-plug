"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
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
  bandId: Id<"bands">;
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
  bandId,
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
  } = useEventGuestList(
    isOpen ? eventId : undefined,
    isOpen ? bandId : undefined,
    { rsvpType: filter, search },
  );
  const isEmpty = !isLoading && guests.length === 0;
  const modalSubtitle = useMemo(
    () => `${totalCount} guests RSVP'd`,
    [totalCount],
  );
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
          : "Failed to update attendance.",
      );
    } finally {
      setActiveRsvpId(null);
    }
  };
  const handleRemoveGuest = async (guest: (typeof guests)[number]) => {
    if (!canManage) return;
    const confirmed = window.confirm(
      `Remove ${guest.name} from the RSVP list?`,
    );
    if (!confirmed) return;
    setError(null);
    setActiveRsvpId(guest.rsvpId);
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
          : "Failed to remove RSVP.",
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
      {" "}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />{" "}
      <div className="relative w-full max-w-4xl max-h-[88vh] overflow-hidden bg-background border-2 border-border">
        {" "}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
          {" "}
          <div>
            {" "}
            <h2 className="text-xl font-bold text-foreground ">
              {" "}
              Guest Control Panel{" "}
            </h2>{" "}
            <p className="text-sm text-muted-foreground mt-1">
              {eventTitle}
            </p>{" "}
            <p className="text-xs text-muted-foreground mt-2">
              {" "}
              {modalSubtitle}{" "}
            </p>{" "}
          </div>{" "}
          <button
            type="button"
            onClick={onClose}
            className="p-2 border border-border text-muted-foreground hover:text-foreground hover:border-zinc-500 transition-colors"
          >
            {" "}
            <X className="w-5 h-5" />{" "}
          </button>{" "}
        </div>{" "}
        <div className="p-5 border-b border-border space-y-4">
          {" "}
          <div className="relative">
            {" "}
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />{" "}
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search guests by name..."
              className="w-full pl-10 pr-3 py-2 bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band/50"
            />{" "}
          </div>{" "}
          <div className="flex flex-wrap gap-2">
            {" "}
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={cn(
                  "px-3 py-1.5 border text-xs font-bold transition-colors",
                  filter === option.value
                    ? "border-band text-band bg-band/10"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {" "}
                {option.label}{" "}
              </button>
            ))}{" "}
          </div>{" "}
          {!canManage && (
            <div className="px-3 py-2 border border-border bg-card text-xs text-muted-foreground">
              {" "}
              Read-only access: only owners and admins can manage
              attendance.{" "}
            </div>
          )}{" "}
          {capReached && (
            <div className="px-3 py-2 border border-band/50 bg-band/10 text-xs text-band">
              {" "}
              Showing latest {cap} RSVPs.{" "}
            </div>
          )}{" "}
          {error && (
            <div className="px-3 py-2 border border-red-500/40 bg-red-500/10 text-xs text-red-300">
              {" "}
              {error}{" "}
            </div>
          )}{" "}
        </div>{" "}
        <div className="overflow-y-auto max-h-[50vh]">
          {" "}
          {isLoading ? (
            <div className="p-5 space-y-3">
              {" "}
              {[1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="h-16 border border-border bg-card animate-shimmer"
                />
              ))}{" "}
            </div>
          ) : isEmpty ? (
            <div className="p-8 text-center">
              {" "}
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />{" "}
              <p className="text-sm text-muted-foreground ">
                {" "}
                No guests found for this filter.{" "}
              </p>{" "}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {" "}
              {guests.map((guest) => {
                const isBusy = activeRsvpId === guest.rsvpId;
                return (
                  <div
                    key={guest.rsvpId}
                    className="p-4 flex items-center gap-3 justify-between"
                  >
                    {" "}
                    <div className="flex items-center gap-3 min-w-0">
                      {" "}
                      <Link
                        href={`/fans/${guest.userId}`}
                        className="flex items-center gap-3 min-w-0 group"
                      >
                        {" "}
                        <AvatarImage
                          src={guest.avatar}
                          alt={guest.name}
                          fallbackText={guest.name}
                          size={44}
                          className="border border-border group-hover:border-band/40 transition-colors"
                        />{" "}
                        <div className="min-w-0">
                          {" "}
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-band transition-colors">
                            {" "}
                            {guest.name}{" "}
                          </p>{" "}
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            {" "}
                            <Clock className="w-3 h-3" />{" "}
                            <span>{formatGuestDate(guest.rsvpedAt)}</span>{" "}
                          </div>{" "}
                        </div>{" "}
                      </Link>{" "}
                    </div>{" "}
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {" "}
                      <span
                        className={cn(
                          "px-2 py-1 text-[10px] font-bold border",
                          guest.rsvpType === "attended"
                            ? "border-band/50 text-band bg-band/10"
                            : "border-border text-muted-foreground bg-card",
                        )}
                      >
                        {" "}
                        {guest.rsvpType === "attended"
                          ? "Attended"
                          : "On List"}{" "}
                      </span>{" "}
                      {canManage && (
                        <>
                          {" "}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleAttendance(guest)}
                            className={cn(
                              "px-2.5 py-1.5 text-[10px] font-bold border transition-colors",
                              guest.rsvpType === "attended"
                                ? "border-border text-muted-foreground hover:border-zinc-500"
                                : "border-band/50 text-band hover:bg-band/10",
                              isBusy && "opacity-50 cursor-not-allowed",
                            )}
                          >
                            {" "}
                            <span className="inline-flex items-center gap-1">
                              {" "}
                              <Check className="w-3.5 h-3.5" />{" "}
                              {guest.rsvpType === "attended"
                                ? "Mark on list"
                                : "Mark attended"}{" "}
                            </span>{" "}
                          </button>{" "}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleRemoveGuest(guest)}
                            className={cn(
                              "px-2.5 py-1.5 text-[10px] font-bold border border-red-500/40 text-red-300 hover:bg-red-500/10 transition-colors",
                              isBusy && "opacity-50 cursor-not-allowed",
                            )}
                          >
                            {" "}
                            <span className="inline-flex items-center gap-1">
                              {" "}
                              <Trash2 className="w-3.5 h-3.5" /> Remove{" "}
                            </span>{" "}
                          </button>{" "}
                        </>
                      )}{" "}
                    </div>{" "}
                  </div>
                );
              })}{" "}
            </div>
          )}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
