"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { UserRole } from "@ear-plug/shared/types";

export function useCurrentUser() {
  const user = useQuery(api.users.getCurrentUser);
  const updateRole = useMutation(api.users.updateRole);
  const updateProfile = useMutation(api.users.updateProfile);

  const setRole = async (role: UserRole) => {
    await updateRole({ role });
  };

  return {
    user,
    isLoading: user === undefined,
    isAuthenticated: user !== null,
    isFan: user?.role === "fan",
    isMusician: user?.role === "musician",
    setRole,
    updateProfile,
  };
}
