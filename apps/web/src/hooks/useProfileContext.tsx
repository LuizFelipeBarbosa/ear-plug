"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type ProfileMode = "personal" | "band";

interface StoredProfileContext {
  mode: ProfileMode;
  bandId?: Id<"bands">;
}

interface ProfileContextValue {
  mode: ProfileMode;
  bandId?: Id<"bands">;
  bands: Array<{
    band: {
      _id: Id<"bands">;
      name: string;
    };
    membership: {
      role: "owner" | "admin" | "member";
    };
  }>;
  activeBand: {
    _id: Id<"bands">;
    name: string;
  } | null;
  isHydrated: boolean;
  isLoadingBands: boolean;
  notice: string | null;
  setPersonalMode: () => void;
  setBandMode: (bandId: Id<"bands">) => void;
  clearNotice: () => void;
}

const STORAGE_KEY = "ear-plug-profile-context-v1";
const DEFAULT_CONTEXT: StoredProfileContext = {
  mode: "personal",
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const memberships = useQuery(api.bands.listMyBands);
  const [state, setState] = useState<StoredProfileContext>(DEFAULT_CONTEXT);
  const [isHydrated, setIsHydrated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Session-scoped hydration (tab isolated).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setIsHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw) as StoredProfileContext;
      if (parsed.mode === "band" && parsed.bandId) {
        setState(parsed);
      } else {
        setState(DEFAULT_CONTEXT);
      }
    } catch (error) {
      console.warn("Failed to hydrate profile context", error);
      setState(DEFAULT_CONTEXT);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const setPersonalMode = useCallback(() => {
    setState(DEFAULT_CONTEXT);
    setNotice(null);
  }, []);

  const setBandMode = useCallback((bandId: Id<"bands">) => {
    setState({
      mode: "band",
      bandId,
    });
    setNotice(null);
  }, []);

  const clearNotice = useCallback(() => {
    setNotice(null);
  }, []);

  // Persist to session storage after hydration.
  useEffect(() => {
    if (!isHydrated) return;

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Failed to persist profile context", error);
    }
  }, [isHydrated, state]);

  const bands = useMemo(() => memberships ?? [], [memberships]);

  // Auto-fallback when stored band access no longer exists.
  useEffect(() => {
    if (!isHydrated || memberships === undefined) return;

    if (state.mode === "band") {
      const stillMember = bands.some(
        (entry) => entry.band._id === state.bandId,
      );
      if (!stillMember) {
        setState(DEFAULT_CONTEXT);
        setNotice("Your active band access changed. Switched to Personal.");
      }
    }
  }, [bands, memberships, state, isHydrated]);

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => {
      setNotice(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [notice]);

  const activeBand = useMemo(() => {
    if (state.mode !== "band" || !state.bandId) {
      return null;
    }
    return bands.find((entry) => entry.band._id === state.bandId)?.band ?? null;
  }, [bands, state]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      mode: state.mode,
      bandId: state.bandId,
      bands,
      activeBand,
      isHydrated,
      isLoadingBands: memberships === undefined,
      notice,
      setPersonalMode,
      setBandMode,
      clearNotice,
    }),
    [
      state,
      bands,
      activeBand,
      isHydrated,
      memberships,
      notice,
      setPersonalMode,
      setBandMode,
      clearNotice,
    ],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfileContext() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error(
      "useProfileContext must be used within a ProfileContextProvider",
    );
  }
  return context;
}
