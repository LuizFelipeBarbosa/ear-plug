/**
 * Minimal Convex Mutation Example
 *
 * This demonstrates the simplest way to modify data in the Ear-Plug Convex backend.
 * Mutations are used for any data changes: creating, updating, or deleting records.
 *
 * Key concepts:
 * - useMutation returns a function that you call to execute the mutation
 * - Mutations are async and return a Promise
 * - After a mutation, related queries automatically re-fetch (real-time sync)
 * - Always handle loading states to provide good UX
 */
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Simple RSVP button demonstrating a basic mutation.
 * Shows the pattern for toggle-style mutations.
 */
export function MinimalMutationExample({ eventId }: { eventId: Id<"events"> }) {
  // Track loading state for better UX
  const [isLoading, setIsLoading] = useState(false);

  // Get the mutation function - this doesn't execute the mutation yet
  const rsvp = useMutation(api.events.rsvp);

  const handleRsvp = async () => {
    setIsLoading(true);
    try {
      // Execute the mutation with arguments
      // Returns { action: "added" | "removed" }
      const result = await rsvp({ eventId });
      console.log("RSVP result:", result.action);
    } catch (error) {
      console.error("RSVP failed:", error);
      // Handle error - show toast, alert, etc.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleRsvp}
      disabled={isLoading}
      className="px-4 py-2 bg-lime text-night font-bold hover:bg-lime/90 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? "Processing..." : "RSVP"}
    </button>
  );
}

/**
 * Form submission example with a create mutation.
 * Demonstrates the pattern for forms that create new records.
 */
export function CreateBandExample() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBand = useMutation(api.bands.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Call the mutation with the form data
      const bandId = await createBand({
        name,
        location,
        genres: ["rock"], // Required field
      });

      console.log("Created band with ID:", bandId);

      // Reset form on success
      setName("");
      setLocation("");
    } catch (err) {
      // Convex mutations throw errors with descriptive messages
      setError(err instanceof Error ? err.message : "Failed to create band");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500 text-red-400">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm text-zinc-400 mb-1">Band Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 bg-night-tertiary border border-zinc-800 text-white focus:border-lime outline-none"
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-1">Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          className="w-full px-3 py-2 bg-night-tertiary border border-zinc-800 text-white focus:border-lime outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 bg-lime text-night font-bold hover:bg-lime/90 disabled:opacity-50"
      >
        {isSubmitting ? "Creating..." : "Create Band"}
      </button>
    </form>
  );
}

/**
 * Like button with optimistic UI feedback.
 * Shows how to provide immediate visual feedback while mutation is in flight.
 */
export function LikeButtonExample({ eventId }: { eventId: Id<"events"> }) {
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const toggleLike = useMutation(api.events.toggleLike);

  const handleLike = async () => {
    // Set optimistic state before mutation completes
    setOptimisticLiked((prev) => (prev === null ? true : !prev));

    try {
      await toggleLike({ eventId });
      // Reset optimistic state - real data will come from query
      setOptimisticLiked(null);
    } catch {
      // Revert optimistic state on error
      setOptimisticLiked((prev) => (prev === null ? null : !prev));
    }
  };

  // Show optimistic state if set, otherwise show default
  const isLiked = optimisticLiked !== null ? optimisticLiked : false;

  return (
    <button
      onClick={handleLike}
      className={`p-2 rounded-full transition-colors ${
        isLiked ? "text-lime" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      <svg
        className={`w-6 h-6 ${isLiked ? "fill-lime" : "fill-none"}`}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  );
}
