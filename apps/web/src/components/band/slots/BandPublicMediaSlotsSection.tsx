"use client";

import { useMemo, useState } from "react";
import { BandMediaSlotsGrid } from "./BandMediaSlotsGrid";
import { BandMediaSlotModal } from "./BandMediaSlotModal";
import {
  usePublicBandMediaSlots,
  type PublicBandProfileSlot,
} from "@/hooks/usePublicBandMediaSlots";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import type { BandMediaSlotIndex } from "@ear-plug/shared/types";

interface BandPublicMediaSlotsSectionProps {
  bandId: Id<"bands">;
  title?: string;
  description?: string;
}

function createEmptySlots(): PublicBandProfileSlot[] {
  return [0, 1, 2, 3, 4, 5].map((slotIndex) => ({
    slotIndex: slotIndex as BandMediaSlotIndex,
    isFilled: false,
    canEdit: false,
  }));
}

export function BandPublicMediaSlotsSection({
  bandId,
  title = "Photos & Videos",
  description = "Band media board.",
}: BandPublicMediaSlotsSectionProps) {
  const { slots, isLoading } = usePublicBandMediaSlots(bandId);
  const [selectedSlotIndex, setSelectedSlotIndex] =
    useState<BandMediaSlotIndex | null>(null);

  const displaySlots = useMemo<PublicBandProfileSlot[]>(() => {
    if (slots.length === 6) {
      return slots;
    }
    return createEmptySlots();
  }, [slots]);

  const selectedSlot =
    selectedSlotIndex === null
      ? null
      : displaySlots.find((slot) => slot.slotIndex === selectedSlotIndex) ?? null;

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
          {title}
        </h3>
        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
          {description}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square bg-night-tertiary border border-zinc-800 animate-shimmer"
            />
          ))}
        </div>
      ) : (
        <BandMediaSlotsGrid
          slots={displaySlots}
          onSelect={(slotIndex) => setSelectedSlotIndex(slotIndex)}
        />
      )}

      {selectedSlot ? (
        <BandMediaSlotModal
          slot={selectedSlot}
          onClose={() => setSelectedSlotIndex(null)}
          onSave={async () => {}}
          onClear={async () => {}}
        />
      ) : null}
    </section>
  );
}
