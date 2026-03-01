"use client";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BandProfileSlot } from "@/hooks/useBandMediaSlots";
import type { BandMediaSlotIndex } from "@ear-plug/shared/types";
interface BandMediaSlotsGridProps {
  slots: BandProfileSlot[];
  onSelect: (slotIndex: BandMediaSlotIndex) => void;
}
const SLOT_PLACEHOLDER_SRC = "/images/band-slot-placeholder.svg";
export function BandMediaSlotsGrid({
  slots,
  onSelect,
}: BandMediaSlotsGridProps) {
  if (slots.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {" "}
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="aspect-square border border-border bg-muted animate-shimmer"
          />
        ))}{" "}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
      {" "}
      {slots.map((slot) => {
        const canOpen = slot.canEdit || slot.isFilled;
        return (
          <button
            key={slot.slotIndex}
            type="button"
            onClick={() => canOpen && onSelect(slot.slotIndex)}
            disabled={!canOpen}
            className={cn(
              "relative aspect-square border border-border bg-muted overflow-hidden group",
              canOpen
                ? "hover:border-band/50 transition-colors"
                : "cursor-not-allowed opacity-70",
            )}
          >
            {" "}
            {slot.isFilled && slot.mediaUrl ? (
              slot.mediaType === "image" ? (
                <img
                  src={slot.mediaUrl}
                  alt={slot.caption || `Slot ${slot.slotIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="relative w-full h-full">
                  {" "}
                  <video
                    src={slot.mediaUrl}
                    className="w-full h-full object-cover"
                    muted
                  />{" "}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    {" "}
                    <Play className="w-6 h-6 text-foreground fill-white" />{" "}
                  </div>{" "}
                </div>
              )
            ) : (
              <div className="absolute inset-0">
                {" "}
                <img
                  src={SLOT_PLACEHOLDER_SRC}
                  alt="Empty media slot"
                  className="w-full h-full object-cover opacity-60"
                />{" "}
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center px-2 text-center">
                  {" "}
                  <span className="text-[10px] font-bold text-zinc-200">
                    {" "}
                    {slot.canEdit ? "Add Media" : "Empty Slot"}{" "}
                  </span>{" "}
                </div>{" "}
              </div>
            )}{" "}
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 text-[10px] font-bold text-zinc-200 border border-border">
              {" "}
              {slot.slotIndex + 1}{" "}
            </div>{" "}
            {slot.caption ? (
              <div className="absolute inset-x-0 bottom-0 px-2 py-1 bg-black/65 text-[10px] text-zinc-100 truncate">
                {" "}
                {slot.caption}{" "}
              </div>
            ) : null}{" "}
          </button>
        );
      })}{" "}
    </div>
  );
}
