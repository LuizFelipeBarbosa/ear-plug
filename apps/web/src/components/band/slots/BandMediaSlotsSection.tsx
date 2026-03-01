"use client";
import { useMemo, useState } from "react";
import { BandMediaSlotsGrid } from "./BandMediaSlotsGrid";
import { BandMediaSlotModal } from "./BandMediaSlotModal";
import {
  useBandMediaSlots,
  type BandProfileSlot,
} from "@/hooks/useBandMediaSlots";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import type { BandMediaSlotIndex } from "@ear-plug/shared/types";
interface BandMediaSlotsSectionProps {
  bandId: Id<"bands">;
  canManageSlots: boolean;
  title?: string;
  description?: string;
}
function createEmptySlots(canEdit: boolean): BandProfileSlot[] {
  return [0, 1, 2, 3, 4, 5].map((slotIndex) => ({
    slotIndex: slotIndex as BandMediaSlotIndex,
    isFilled: false,
    canEdit,
  }));
}
export function BandMediaSlotsSection({
  bandId,
  canManageSlots,
  title = "Photos & Videos",
  description = "Manage six profile media slots.",
}: BandMediaSlotsSectionProps) {
  const { slots, isLoading, saveSlot, clearSlot } = useBandMediaSlots(bandId);
  const [selectedSlotIndex, setSelectedSlotIndex] =
    useState<BandMediaSlotIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const displaySlots = useMemo<BandProfileSlot[]>(() => {
    if (slots.length === 6) {
      return slots;
    }
    return createEmptySlots(canManageSlots);
  }, [slots, canManageSlots]);
  const selectedSlot =
    selectedSlotIndex === null
      ? null
      : (displaySlots.find((slot) => slot.slotIndex === selectedSlotIndex) ??
        null);
  const handleSaveSlot = async (input: {
    slotIndex: BandMediaSlotIndex;
    caption?: string;
    location?: string;
    file?: File;
  }) => {
    setError(null);
    const slot = displaySlots.find(
      (entry) => entry.slotIndex === input.slotIndex,
    );
    await saveSlot({
      ...input,
      existingMedia:
        slot?.isFilled && slot.mediaStorageId && slot.mediaType
          ? {
              storageId: slot.mediaStorageId,
              mediaType: slot.mediaType,
              durationSeconds: slot.durationSeconds,
            }
          : undefined,
    });
  };
  const handleClearSlot = async (slotIndex: BandMediaSlotIndex) => {
    setError(null);
    await clearSlot(slotIndex);
  };
  return (
    <section className="space-y-3">
      {" "}
      <div>
        {" "}
        <h3 className="text-sm font-bold text-muted-foreground">
          {" "}
          {title}{" "}
        </h3>{" "}
        <p className="text-xs text-muted-foreground mt-1 ">
          {" "}
          {description}{" "}
        </p>{" "}
      </div>{" "}
      {error ? (
        <p className="text-xs text-red-400 border border-red-500/30 bg-red-500/10 px-3 py-2">
          {" "}
          {error}{" "}
        </p>
      ) : null}{" "}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          {" "}
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square bg-muted border border-border animate-shimmer"
            />
          ))}{" "}
        </div>
      ) : (
        <BandMediaSlotsGrid
          slots={displaySlots}
          onSelect={(slotIndex) => setSelectedSlotIndex(slotIndex)}
        />
      )}{" "}
      {selectedSlot ? (
        <BandMediaSlotModal
          slot={selectedSlot}
          onClose={() => setSelectedSlotIndex(null)}
          onSave={async (input) => {
            try {
              await handleSaveSlot(input);
            } catch (saveError) {
              const message =
                saveError instanceof Error
                  ? saveError.message
                  : "Failed to save slot.";
              setError(message);
              throw saveError;
            }
          }}
          onClear={async (slotIndex) => {
            try {
              await handleClearSlot(slotIndex);
            } catch (clearError) {
              const message =
                clearError instanceof Error
                  ? clearError.message
                  : "Failed to clear slot.";
              setError(message);
              throw clearError;
            }
          }}
        />
      ) : null}{" "}
    </section>
  );
}
