import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";

export function useBandMediaSlots(bandId: Id<"bands"> | undefined) {
  const slotsResult = useQuery(api.bandMediaSlots.listProfileSlots, bandId ? { bandId } : "skip");
  const generateUploadUrl = useMutation(api.bandMediaSlots.generateUploadUrl);
  const upsertSlot = useMutation(api.bandMediaSlots.upsertSlot);
  const clearSlot = useMutation(api.bandMediaSlots.clearSlot);

  return {
    slots: slotsResult?.slots ?? [],
    isLoading: bandId !== undefined && slotsResult === undefined,
    generateUploadUrl,
    upsertSlot,
    clearSlot,
  };
}

export function usePublicBandMediaSlots(bandId: Id<"bands"> | undefined) {
  const slotsResult = useQuery(api.bandMediaSlots.listPublicSlots, bandId ? { bandId } : "skip");

  return {
    slots: slotsResult?.slots ?? [],
    isLoading: bandId !== undefined && slotsResult === undefined,
  };
}
