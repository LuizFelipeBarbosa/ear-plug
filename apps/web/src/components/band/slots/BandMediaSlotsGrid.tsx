"use client";

import { Play, Plus, ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { BandProfileSlot } from "@/hooks/useBandMediaSlots";
import type { BandMediaSlotIndex } from "@ear-plug/shared/types";

interface BandMediaSlotsGridProps {
  slots: BandProfileSlot[];
  onSelect: (slotIndex: BandMediaSlotIndex) => void;
}

export function BandMediaSlotsGrid({ slots, onSelect }: BandMediaSlotsGridProps) {
  if (slots.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="aspect-square bg-muted border border-border rounded-xl animate-shimmer"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {slots.map((slot, index) => {
        const canOpen = slot.canEdit || slot.isFilled;

        return (
          <motion.button
            key={slot.slotIndex}
            type="button"
            onClick={() => canOpen && onSelect(slot.slotIndex)}
            disabled={!canOpen}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 25 }}
            className={cn(
              "relative aspect-square rounded-xl overflow-hidden",
              canOpen
                ? "cursor-pointer"
                : "cursor-not-allowed opacity-60",
              slot.isFilled
                ? "ring-1 ring-border"
                : "border-2 border-dashed border-border"
            )}
          >
            {/* Slot Number Badge */}
            <div className="absolute top-2 left-2 z-10 w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
              <span className="text-[10px] font-bold text-white leading-none">{slot.slotIndex + 1}</span>
            </div>

            {/* Media Content */}
            {slot.isFilled && slot.mediaUrl ? (
              slot.mediaType === "image" ? (
                <img
                  src={slot.mediaUrl}
                  alt={slot.caption || `Slot ${slot.slotIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="relative w-full h-full">
                  <video src={slot.mediaUrl} className="w-full h-full object-cover" muted />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* Empty Slot */
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50">
                {slot.canEdit ? (
                  <>
                    <div className="w-12 h-12 bg-band/10 rounded-full flex items-center justify-center mb-2">
                      <Plus className="w-5 h-5 text-band" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      Add Media
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-2">
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Empty</span>
                  </>
                )}
              </div>
            )}

            {/* Caption Overlay */}
            {slot.caption && (
              <div className="absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-[10px] text-white truncate">{slot.caption}</p>
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
