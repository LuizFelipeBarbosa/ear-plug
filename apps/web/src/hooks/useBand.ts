"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useCurrentBand() {
  const band = useQuery(api.bands.getCurrentUserBand);
  const bandWithStats = useQuery(api.bands.getBandWithStats);
  const createBand = useMutation(api.bands.create);
  const updateBand = useMutation(api.bands.update);

  return {
    band,
    bandWithStats,
    isLoading: band === undefined,
    createBand,
    updateBand,
  };
}

export function useBandAnalytics(bandId: Id<"bands"> | undefined) {
  const analytics = useQuery(
    api.bands.getAnalytics,
    bandId ? { bandId } : "skip"
  );

  return {
    analytics,
    isLoading: analytics === undefined,
  };
}

export function useSavedBands() {
  const savedBands = useQuery(api.bands.getSavedBands);
  const toggleSave = useMutation(api.bands.toggleSave);

  return {
    savedBands: savedBands ?? [],
    isLoading: savedBands === undefined,
    toggleSave: (bandId: Id<"bands">) => toggleSave({ bandId }),
  };
}
