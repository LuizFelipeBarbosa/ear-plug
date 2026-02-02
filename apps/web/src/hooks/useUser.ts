/**
 * @fileoverview Custom hook for user authentication and profile management.
 * Wraps Convex user queries and mutations with a convenient React interface.
 * @module hooks/useUser
 */

"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { UserRole } from "@ear-plug/shared/types";

/**
 * Hook for accessing and managing the current user's data.
 * Provides user information, authentication status, role helpers, and profile update functions.
 *
 * @returns Object containing user data and helper functions
 *
 * @example
 * function ProfilePage() {
 *   const { user, isLoading, isFan, isMusician, setRole, updateProfile } = useCurrentUser();
 *
 *   if (isLoading) return <Spinner />;
 *   if (!user) return <SignInPrompt />;
 *
 *   return (
 *     <div>
 *       <h1>Welcome, {user.name}!</h1>
 *       {isFan && <FanDashboard />}
 *       {isMusician && <MusicianDashboard />}
 *     </div>
 *   );
 * }
 *
 * @example
 * // Updating user role during onboarding
 * const { setRole } = useCurrentUser();
 * await setRole("musician");
 *
 * @example
 * // Updating user profile
 * const { updateProfile } = useCurrentUser();
 * await updateProfile({
 *   name: "New Name",
 *   location: "Oakland, CA",
 *   topGenres: ["rock", "indie"]
 * });
 */
export function useCurrentUser() {
  /** Current user document from Convex, undefined while loading, null if not authenticated */
  const user = useQuery(api.users.getCurrentUser);

  /** Mutation to update the user's role */
  const updateRole = useMutation(api.users.updateRole);

  /** Mutation to update the user's profile */
  const updateProfile = useMutation(api.users.updateProfile);

  /**
   * Sets the user's role (fan or musician).
   * Typically called during onboarding.
   *
   * @param role - The role to set ("fan" or "musician")
   * @returns Promise that resolves when the role is updated
   */
  const setRole = async (role: UserRole) => {
    await updateRole({ role });
  };

  return {
    /** The current user document, or null if not authenticated */
    user,
    /** True while the user query is loading */
    isLoading: user === undefined,
    /** True if a user is authenticated (user is not null) */
    isAuthenticated: user !== null,
    /** True if the user has the "fan" role */
    isFan: user?.role === "fan",
    /** True if the user has the "musician" role */
    isMusician: user?.role === "musician",
    /** Function to update the user's role */
    setRole,
    /** Convex mutation to update profile fields */
    updateProfile,
  };
}
