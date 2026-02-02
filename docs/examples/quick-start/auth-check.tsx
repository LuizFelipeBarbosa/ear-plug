/**
 * Basic Auth-Protected Component Example
 *
 * This demonstrates how to create components that require authentication
 * and render different UI based on user authentication status and role.
 *
 * Key concepts:
 * - Use useCurrentUser hook to access auth state
 * - isLoading distinguishes between "checking auth" and "not authenticated"
 * - Role-based rendering using isFan/isMusician helpers
 * - Protected routes are handled by Clerk middleware (see middleware.ts)
 */
"use client";

import { useCurrentUser } from "@/hooks/useUser";
import type { ReactNode } from "react";

/**
 * Simple auth check component.
 * Redirects or shows sign-in prompt for unauthenticated users.
 */
export function AuthCheckExample() {
  const { user, isLoading, isAuthenticated } = useCurrentUser();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-lime animate-pulse-lime" />
        </div>
      </div>
    );
  }

  // User is not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-night p-4">
        <h1 className="text-2xl font-bold text-white mb-4">
          Sign in to continue
        </h1>
        <p className="text-zinc-400 mb-6 text-center">
          Please sign in to access this content.
        </p>
        <a
          href="/sign-in"
          className="px-6 py-3 bg-lime text-night font-bold hover:bg-lime/90"
        >
          Sign In
        </a>
      </div>
    );
  }

  // User is authenticated - show protected content
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-2">
        Welcome, {user.name}!
      </h1>
      <p className="text-zinc-400">
        You are signed in as a {user.role}.
      </p>
    </div>
  );
}

/**
 * Role-based rendering component.
 * Shows different UI for fans vs musicians.
 */
export function RoleBasedExample() {
  const { user, isLoading, isFan, isMusician } = useCurrentUser();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <SignInPrompt />;
  }

  // Render different dashboards based on role
  if (isFan) {
    return <FanDashboard user={user} />;
  }

  if (isMusician) {
    return <MusicianDashboard user={user} />;
  }

  // Fallback for users without a role (during onboarding)
  return <RoleSelectionPrompt />;
}

/**
 * Higher-order component pattern for auth protection.
 * Wrap any component to require authentication.
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P & { user: NonNullable<ReturnType<typeof useCurrentUser>["user"]> }>
) {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading } = useCurrentUser();

    if (isLoading) {
      return <LoadingSpinner />;
    }

    if (!user) {
      return <SignInPrompt />;
    }

    return <Component {...props} user={user} />;
  };
}

/**
 * Render props pattern for auth.
 * Provides flexibility in how to handle auth states.
 */
export function AuthGuard({
  children,
  fallback,
  loadingFallback,
}: {
  children: (user: NonNullable<ReturnType<typeof useCurrentUser>["user"]>) => ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}) {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <>{loadingFallback ?? <LoadingSpinner />}</>;
  }

  if (!user) {
    return <>{fallback ?? <SignInPrompt />}</>;
  }

  return <>{children(user)}</>;
}

// Usage example:
// <AuthGuard>
//   {(user) => <ProfilePage user={user} />}
// </AuthGuard>

/**
 * Role-specific guard component.
 * Only renders children if user has the specified role.
 */
export function RoleGuard({
  role,
  children,
  fallback,
}: {
  role: "fan" | "musician";
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user, isLoading, isFan, isMusician } = useCurrentUser();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <SignInPrompt />;
  }

  const hasRole = role === "fan" ? isFan : isMusician;

  if (!hasRole) {
    return <>{fallback ?? <RoleNotAllowed requiredRole={role} />}</>;
  }

  return <>{children}</>;
}

// Helper components used in examples above

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <h2 className="text-xl font-bold text-white mb-2">Sign in required</h2>
      <p className="text-zinc-400 mb-4">Please sign in to access this feature.</p>
      <a href="/sign-in" className="btn-brutalist">
        Sign In
      </a>
    </div>
  );
}

function RoleSelectionPrompt() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <h2 className="text-xl font-bold text-white mb-2">Complete your profile</h2>
      <p className="text-zinc-400 mb-4">Choose your role to continue.</p>
    </div>
  );
}

function RoleNotAllowed({ requiredRole }: { requiredRole: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <h2 className="text-xl font-bold text-white mb-2">Access denied</h2>
      <p className="text-zinc-400">
        This page is only available for {requiredRole}s.
      </p>
    </div>
  );
}

function FanDashboard({ user }: { user: { name: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white">Fan Dashboard</h1>
      <p className="text-zinc-400">Welcome back, {user.name}!</p>
    </div>
  );
}

function MusicianDashboard({ user }: { user: { name: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white">Musician Dashboard</h1>
      <p className="text-zinc-400">Welcome back, {user.name}!</p>
    </div>
  );
}
