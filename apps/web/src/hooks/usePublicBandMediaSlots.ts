"use client";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type {
  BandMediaSlotIndex,
  BandPostMediaType,
} from "@ear-plug/shared/types";
export interface PublicBandProfileSlot {
  slotIndex: BandMediaSlotIndex;
  isFilled: boolean;
  mediaType?: BandPostMediaType;
  mediaUrl?: string | null;
  caption?: string;
  location?: string;
  durationSeconds?: number;
  canEdit: boolean;
}
export function usePublicBandMediaSlots(bandId: Id<"bands"> | undefined) {
  const response = useQuery(
    api.bandMediaSlots.listPublicSlots,
    bandId ? { bandId } : "skip",
  );
  const slots = useMemo(() => {
    return (response?.slots ?? []) as unknown as PublicBandProfileSlot[];
  }, [response?.slots]);
  return { slots, isLoading: response === undefined };
}
