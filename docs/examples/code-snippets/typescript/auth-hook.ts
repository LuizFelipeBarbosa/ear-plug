/**
 * Authentication Hook Patterns
 *
 * This file demonstrates patterns for integrating Clerk authentication
 * with Convex queries and React components.
 */

import { useCallback, useEffect, useState } from "react";
import { useAuth, useUser as useClerkUser } from "@clerk/nextjs";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { UserRole, Genre } from "@ear-plug/shared/types";

// =============================================================================
// PATTERN 1: Complete User Hook
// =============================================================================

/**
 * Primary hook for accessing user authentication and profile data.
 * Combines Clerk auth state with Convex user data.
 *
 * This is the recommended pattern for most components that need user data.
 */
export function useCurrentUser() {
  // Convex user document (synced from Clerk via webhook)
  const user = useQuery(api.users.getCurrentUser);

  // Mutations for user management
  const updateRole = useMutation(api.users.updateRole);
  const updateProfile = useMutation(api.users.updateProfile);

  // Derived state helpers
  const isLoading = user === undefined;
  const isAuthenticated = user !== null && user !== undefined;
  const isFan = user?.role === "fan";
  const isMusician = user?.role === "musician";

  // Role update helper
  const setRole = async (role: UserRole) => {
    await updateRole({ role });
  };

  return {
    // User data
    user,

    // Loading states
    isLoading,
    isAuthenticated,

    // Role helpers
    isFan,
    isMusician,
    hasRole: user?.role !== undefined,

    // Mutations
    setRole,
    updateProfile,
  };
}

// =============================================================================
// PATTERN 2: Auth State Only (Lightweight)
// =============================================================================

/**
 * Lightweight hook for just checking authentication status.
 * Use this when you don't need the full user document.
 */
export function useAuthStatus() {
  // Use Convex's auth hook for efficient auth checking
  const { isLoading, isAuthenticated } = useConvexAuth();

  return {
    isLoading,
    isAuthenticated,
    // Helper for conditional rendering
    showAuthenticatedContent: !isLoading && isAuthenticated,
    showUnauthenticatedContent: !isLoading && !isAuthenticated,
  };
}

// =============================================================================
// PATTERN 3: Clerk + Convex Sync Status
// =============================================================================

/**
 * Hook for checking if Clerk and Convex are in sync.
 * Useful for debugging auth issues or showing sync status.
 */
export function useAuthSync() {
  const { isSignedIn, userId: clerkUserId } = useAuth();
  const { isAuthenticated: convexAuthenticated } = useConvexAuth();
  const convexUser = useQuery(api.users.getCurrentUser);

  // Check sync status
  const isClerkSignedIn = isSignedIn === true;
  const isConvexAuthenticated = convexAuthenticated;
  const hasConvexUser = convexUser !== null && convexUser !== undefined;
  const convexUserMatchesClerk = convexUser?.clerkId === clerkUserId;

  // Determine overall sync state
  let syncState: "synced" | "syncing" | "mismatch" | "signed-out";

  if (!isClerkSignedIn && !isConvexAuthenticated) {
    syncState = "signed-out";
  } else if (isClerkSignedIn && hasConvexUser && convexUserMatchesClerk) {
    syncState = "synced";
  } else if (isClerkSignedIn && !hasConvexUser) {
    syncState = "syncing"; // Webhook hasn't processed yet
  } else {
    syncState = "mismatch"; // Something's wrong
  }

  return {
    isClerkSignedIn,
    isConvexAuthenticated,
    hasConvexUser,
    syncState,
    // Debug info
    debug: {
      clerkUserId,
      convexClerkId: convexUser?.clerkId,
      convexUserId: convexUser?._id,
    },
  };
}

// =============================================================================
// PATTERN 4: Protected Hook Wrapper
// =============================================================================

/**
 * Creates a hook that throws if user is not authenticated.
 * Use this for hooks that should only work for authenticated users.
 */
export function useRequireAuth() {
  const { user, isLoading, isAuthenticated } = useCurrentUser();

  if (isLoading) {
    return {
      user: null,
      isLoading: true,
      isReady: false,
    } as const;
  }

  if (!isAuthenticated || !user) {
    // In a real app, you might redirect here instead of throwing
    throw new AuthRequiredError("Authentication required");
  }

  return {
    user, // TypeScript knows user is not null here
    isLoading: false,
    isReady: true,
  } as const;
}

/**
 * Custom error for auth requirement.
 */
export class AuthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthRequiredError";
  }
}

// =============================================================================
// PATTERN 5: Role-Based Auth Hook
// =============================================================================

/**
 * Hook that enforces a specific role requirement.
 * Returns null if user doesn't have the required role.
 */
export function useRequireRole(requiredRole: UserRole) {
  const { user, isLoading, isFan, isMusician } = useCurrentUser();

  // Check if user has the required role
  const hasRequiredRole =
    (requiredRole === "fan" && isFan) ||
    (requiredRole === "musician" && isMusician);

  if (isLoading) {
    return {
      user: null,
      isLoading: true,
      hasAccess: false,
      reason: null,
    } as const;
  }

  if (!user) {
    return {
      user: null,
      isLoading: false,
      hasAccess: false,
      reason: "not-authenticated" as const,
    };
  }

  if (!hasRequiredRole) {
    return {
      user,
      isLoading: false,
      hasAccess: false,
      reason: "wrong-role" as const,
    };
  }

  return {
    user,
    isLoading: false,
    hasAccess: true,
    reason: null,
  };
}

// =============================================================================
// PATTERN 6: Onboarding State Hook
// =============================================================================

/**
 * Hook for managing onboarding flow state.
 * Determines what step the user is on in the onboarding process.
 */
export function useOnboardingState() {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return {
      step: "loading" as const,
      isComplete: false,
    };
  }

  if (!user) {
    return {
      step: "not-authenticated" as const,
      isComplete: false,
    };
  }

  // Check if user has selected a role
  if (!user.role) {
    return {
      step: "role-selection" as const,
      isComplete: false,
    };
  }

  // Check if musician has created a band
  if (user.role === "musician") {
    // You would check for band here
    // const { band } = useCurrentBand();
    return {
      step: "profile-complete" as const,
      isComplete: true,
    };
  }

  // Fan profile is complete with just role
  return {
    step: "profile-complete" as const,
    isComplete: true,
  };
}

// =============================================================================
// PATTERN 7: Session Management Hook
// =============================================================================

/**
 * Hook for session management actions.
 * Provides sign-out and session refresh capabilities.
 */
export function useSessionManagement() {
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      // Redirect happens automatically via Clerk
    } catch (error) {
      console.error("Sign out failed:", error);
      setIsSigningOut(false);
    }
  }, [signOut]);

  return {
    signOut: handleSignOut,
    isSigningOut,
  };
}

// =============================================================================
// PATTERN 8: Auth Event Listeners
// =============================================================================

/**
 * Hook for reacting to authentication events.
 * Useful for analytics, logging, or side effects.
 */
export function useAuthEvents(callbacks: {
  onSignIn?: (userId: string) => void;
  onSignOut?: () => void;
  onRoleChange?: (role: UserRole) => void;
}) {
  const { user } = useCurrentUser();
  const [prevUser, setPrevUser] = useState(user);

  useEffect(() => {
    // Detect sign-in
    if (!prevUser && user) {
      callbacks.onSignIn?.(user._id);
    }

    // Detect sign-out
    if (prevUser && !user) {
      callbacks.onSignOut?.();
    }

    // Detect role change
    if (prevUser?.role !== user?.role && user?.role) {
      callbacks.onRoleChange?.(user.role);
    }

    setPrevUser(user);
  }, [user, prevUser, callbacks]);
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type AuthState = ReturnType<typeof useCurrentUser>;
export type OnboardingStep = ReturnType<typeof useOnboardingState>["step"];
