"use client";

import { ArrowRight } from "lucide-react";
import { AvatarImage } from "@/components/ui/OptimizedImage";
import type { GuestRsvpType } from "@ear-plug/shared/types";

interface GuestListCardProps {
  totalCount: number;
  previewGuests: Array<{
    rsvpId: string;
    userId: string;
    name: string;
    avatar?: string;
    rsvpType: GuestRsvpType;
  }>;
  canManage: boolean;
  onOpen: () => void;
}

export function GuestListCard({
  totalCount,
  previewGuests,
  canManage,
  onOpen,
}: GuestListCardProps) {
  const overflowCount = Math.max(0, totalCount - previewGuests.length);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mb-6 w-full text-left p-4 bg-night-tertiary border-2 border-zinc-800 hover:border-lime/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            Guest List
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {totalCount} On The List
          </p>
          <p className="text-[11px] uppercase tracking-wider mt-2 text-zinc-500">
            {canManage ? "Owner/Admin controls enabled" : "Read-only access"}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-3 py-2 border border-zinc-700 text-xs font-bold uppercase tracking-wider text-zinc-200">
          View all
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
        {previewGuests.map((guest) => (
          <div key={guest.rsvpId} className="shrink-0">
            <AvatarImage
              src={guest.avatar}
              alt={guest.name}
              fallbackText={guest.name}
              size={56}
              className="border border-zinc-700"
            />
          </div>
        ))}

        {overflowCount > 0 && (
          <div className="shrink-0 w-14 h-14 rounded-full border border-zinc-700 bg-night-secondary flex items-center justify-center">
            <span className="text-sm font-bold text-zinc-200">+{overflowCount}</span>
          </div>
        )}
      </div>
    </button>
  );
}
