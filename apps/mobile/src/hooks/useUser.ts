import { api } from "../../../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

export function useCurrentUser() {
  const user = useQuery(api.users.getCurrentUser);
  const updateProfile = useMutation(api.users.updateProfile);

  return {
    user,
    isLoading: user === undefined,
    isAuthenticated: user !== null,
    updateProfile,
  };
}
