/**
 * Convex Mutation Patterns
 *
 * This file demonstrates common patterns for mutating data in Convex
 * with proper error handling, loading states, and optimistic updates.
 */

import { useState, useCallback, useTransition } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { Genre } from "@ear-plug/shared/types";

// =============================================================================
// PATTERN 1: Basic Mutation with Loading State
// =============================================================================

/**
 * Basic mutation pattern with explicit loading state.
 * Use this when you need fine-grained control over the mutation lifecycle.
 */
export function useRsvpToEvent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rsvpMutation = useMutation(api.events.rsvp);

  const rsvp = async (eventId: Id<"events">) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await rsvpMutation({ eventId });
      return result; // { action: "added" | "removed" }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to RSVP";
      setError(message);
      throw err; // Re-throw so caller can handle if needed
    } finally {
      setIsLoading(false);
    }
  };

  return {
    rsvp,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

// =============================================================================
// PATTERN 2: Toggle Mutation with Optimistic State
// =============================================================================

/**
 * Toggle mutation with optimistic UI updates.
 * Shows the expected result immediately, then syncs with actual result.
 */
export function useOptimisticLike(eventId: Id<"events">) {
  // Current state from server
  const status = useQuery(api.events.getUserEventStatus, { eventId });
  const toggleLike = useMutation(api.events.toggleLike);

  // Optimistic state (null means use server state)
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);

  const handleToggle = async () => {
    // Determine current state
    const currentlyLiked = optimisticLiked ?? status?.hasLiked ?? false;

    // Set optimistic state to opposite
    setOptimisticLiked(!currentlyLiked);

    try {
      await toggleLike({ eventId });
      // On success, clear optimistic state - real data will come from query
      setOptimisticLiked(null);
    } catch {
      // On error, revert optimistic state
      setOptimisticLiked(currentlyLiked);
    }
  };

  return {
    isLiked: optimisticLiked ?? status?.hasLiked ?? false,
    toggle: handleToggle,
    // True during the optimistic period
    isPending: optimisticLiked !== null,
  };
}

// =============================================================================
// PATTERN 3: Form Submission Mutation
// =============================================================================

/**
 * Pattern for form submissions with validation and reset.
 */
export function useCreateBand() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBandId, setCreatedBandId] = useState<Id<"bands"> | null>(null);

  const createBand = useMutation(api.bands.create);

  const submit = async (formData: {
    name: string;
    genres: Genre[];
    location: string;
    bio?: string;
    image?: string;
  }) => {
    // Client-side validation
    if (!formData.name.trim()) {
      setError("Band name is required");
      return null;
    }

    if (formData.genres.length === 0) {
      setError("Select at least one genre");
      return null;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const bandId = await createBand({
        name: formData.name.trim(),
        genres: formData.genres,
        location: formData.location.trim(),
        bio: formData.bio?.trim() || undefined,
        image: formData.image || undefined,
      });

      setCreatedBandId(bandId);
      return bandId;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create band";
      setError(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submit,
    isSubmitting,
    error,
    createdBandId,
    reset: () => {
      setError(null);
      setCreatedBandId(null);
    },
  };
}

// =============================================================================
// PATTERN 4: Mutation with Dependent Actions
// =============================================================================

/**
 * Pattern for mutations that trigger additional actions.
 * Example: Creating an event and then notifying followers.
 */
export function useCreateEventWithVenue() {
  const [status, setStatus] = useState<
    "idle" | "creating-venue" | "creating-event" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const createWithVenue = useMutation(api.events.createWithVenue);

  const create = async (eventData: {
    title: string;
    bandId: Id<"bands">;
    dateTime: number;
    genres: Genre[];
    venue: {
      name: string;
      address: string;
      city: string;
      coordinates: { lat: number; lng: number };
      placeId?: string;
    };
  }) => {
    setStatus("creating-venue");
    setError(null);

    try {
      // Single mutation handles both venue and event creation
      setStatus("creating-event");

      const result = await createWithVenue({
        title: eventData.title,
        bandId: eventData.bandId,
        dateTime: eventData.dateTime,
        genres: eventData.genres,
        venueName: eventData.venue.name,
        venueAddress: eventData.venue.address,
        venueCity: eventData.venue.city,
        venueCoordinates: eventData.venue.coordinates,
        venuePlaceId: eventData.venue.placeId,
      });

      setStatus("success");
      return result;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to create event");
      return null;
    }
  };

  return {
    create,
    status,
    error,
    isCreating: status === "creating-venue" || status === "creating-event",
    reset: () => {
      setStatus("idle");
      setError(null);
    },
  };
}

// =============================================================================
// PATTERN 5: Batch Mutations
// =============================================================================

/**
 * Pattern for performing multiple mutations in sequence.
 * Useful for bulk operations or multi-step processes.
 */
export function useBulkRsvp() {
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const rsvp = useMutation(api.events.rsvp);

  const bulkRsvp = async (eventIds: Id<"events">[]) => {
    setIsProcessing(true);
    setProgress({ completed: 0, total: eventIds.length });
    setErrors([]);

    const results: { eventId: Id<"events">; success: boolean }[] = [];

    for (let i = 0; i < eventIds.length; i++) {
      try {
        await rsvp({ eventId: eventIds[i] });
        results.push({ eventId: eventIds[i], success: true });
      } catch (err) {
        results.push({ eventId: eventIds[i], success: false });
        setErrors((prev) => [...prev, `Failed to RSVP to event ${eventIds[i]}`]);
      }
      setProgress({ completed: i + 1, total: eventIds.length });
    }

    setIsProcessing(false);
    return results;
  };

  return {
    bulkRsvp,
    progress,
    isProcessing,
    errors,
    hasErrors: errors.length > 0,
  };
}

// =============================================================================
// PATTERN 6: Mutation with useTransition (React 18+)
// =============================================================================

/**
 * Using React's useTransition for non-blocking UI updates.
 * Useful when the mutation might trigger expensive re-renders.
 */
export function useNonBlockingRsvp() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const rsvp = useMutation(api.events.rsvp);

  const handleRsvp = (eventId: Id<"events">) => {
    setError(null);

    startTransition(async () => {
      try {
        await rsvp({ eventId });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to RSVP");
      }
    });
  };

  return {
    handleRsvp,
    isPending,
    error,
  };
}

// =============================================================================
// PATTERN 7: Debounced Mutation
// =============================================================================

/**
 * Pattern for debouncing mutations (e.g., auto-save).
 * Prevents excessive API calls during rapid user input.
 */
export function useDebouncedProfileUpdate() {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const updateProfile = useMutation(api.users.updateProfile);

  const debouncedUpdate = useCallback(
    (data: { name?: string; location?: string; avatar?: string }) => {
      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Set new timeout
      const newTimeoutId = setTimeout(async () => {
        setIsSaving(true);
        try {
          await updateProfile(data);
          setLastSaved(new Date());
        } catch (err) {
          console.error("Auto-save failed:", err);
        } finally {
          setIsSaving(false);
        }
      }, 1000); // 1 second debounce

      setTimeoutId(newTimeoutId);
    },
    [timeoutId, updateProfile]
  );

  // Cleanup on unmount
  const cancel = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }, [timeoutId]);

  return {
    update: debouncedUpdate,
    cancel,
    isSaving,
    lastSaved,
    hasPendingChanges: timeoutId !== null,
  };
}

// =============================================================================
// PATTERN 8: Mutation with Rollback
// =============================================================================

/**
 * Pattern for mutations that can be undone.
 * Stores previous state for potential rollback.
 */
export function useUndoableDelete() {
  const [deletedItems, setDeletedItems] = useState<
    Array<{ id: Id<"notifications">; timestamp: number }>
  >([]);

  const remove = useMutation(api.notifications.remove);
  // Note: In a real app, you'd need a restore mutation

  const deleteWithUndo = async (
    notificationId: Id<"notifications">,
    undoWindowMs: number = 5000
  ) => {
    // Track deletion for undo
    const deletion = { id: notificationId, timestamp: Date.now() };
    setDeletedItems((prev) => [...prev, deletion]);

    // Set timeout to actually delete
    const timeoutId = setTimeout(async () => {
      try {
        await remove({ notificationId });
      } catch (err) {
        console.error("Delete failed:", err);
      }
      // Remove from tracked items
      setDeletedItems((prev) => prev.filter((d) => d.id !== notificationId));
    }, undoWindowMs);

    // Return undo function
    return () => {
      clearTimeout(timeoutId);
      setDeletedItems((prev) => prev.filter((d) => d.id !== notificationId));
    };
  };

  return {
    deleteWithUndo,
    pendingDeletions: deletedItems,
  };
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateBandFormData = Parameters<
  ReturnType<typeof useCreateBand>["submit"]
>[0];
