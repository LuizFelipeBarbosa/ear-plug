"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, AlertCircle } from "lucide-react";
import { BandMediaSlotsGrid } from "./BandMediaSlotsGrid";
import { BandMediaSlotModal } from "./BandMediaSlotModal";
import { useBandMediaSlots, type BandProfileSlot } from "@/hooks/useBandMediaSlots";
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export function BandMediaSlotsSection({
  bandId,
  canManageSlots,
  title = "Photos & Videos",
  description = "Manage six profile media slots. Drag to reorder.",
}: BandMediaSlotsSectionProps) {
  const { slots, isLoading, saveSlot, clearSlot } = useBandMediaSlots(bandId);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<BandMediaSlotIndex | null>(null);
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
      : (displaySlots.find((slot) => slot.slotIndex === selectedSlotIndex) ?? null);

  const filledSlotsCount = displaySlots.filter((s) => s.isFilled).length;

  const handleSaveSlot = async (input: {
    slotIndex: BandMediaSlotIndex;
    caption?: string;
    location?: string;
    file?: File;
  }) => {
    setError(null);
    const slot = displaySlots.find((entry) => entry.slotIndex === input.slotIndex);
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
    <section className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            filledSlotsCount === 6
              ? "bg-green-500/10 text-green-500 border border-green-500/20"
              : "bg-muted text-muted-foreground border border-border"
          }`}
        >
          {filledSlotsCount}/6
        </span>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-xl"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-500">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="aspect-square bg-muted border border-border rounded-xl animate-shimmer"
              />
            ))}
          </div>
        ) : (
          <BandMediaSlotsGrid
            slots={displaySlots}
            onSelect={(slotIndex) => setSelectedSlotIndex(slotIndex)}
          />
        )}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {selectedSlot && (
          <BandMediaSlotModal
            slot={selectedSlot}
            onClose={() => setSelectedSlotIndex(null)}
            onSave={async (input) => {
              try {
                await handleSaveSlot(input);
              } catch (saveError) {
                const message =
                  saveError instanceof Error ? saveError.message : "Failed to save slot.";
                setError(message);
                throw saveError;
              }
            }}
            onClear={async (slotIndex) => {
              try {
                await handleClearSlot(slotIndex);
              } catch (clearError) {
                const message =
                  clearError instanceof Error ? clearError.message : "Failed to clear slot.";
                setError(message);
                throw clearError;
              }
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
