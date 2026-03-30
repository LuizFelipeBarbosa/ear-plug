import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "@/constants/storage";

export type ProfileMode = "personal" | "band";

interface StoredProfileContext {
  mode: ProfileMode;
  bandId?: Id<"bands">;
}

interface BandMembershipEntry {
  band: {
    _id: Id<"bands">;
    name: string;
  };
  membership: {
    role: "owner" | "admin" | "member";
  };
}

interface ProfileContextValue {
  mode: ProfileMode;
  bandId?: Id<"bands">;
  bands: BandMembershipEntry[];
  activeBand: BandMembershipEntry["band"] | null;
  isHydrated: boolean;
  isLoadingBands: boolean;
  notice: string | null;
  setPersonalMode: () => void;
  setBandMode: (bandId: Id<"bands">) => void;
  clearNotice: () => void;
}

const DEFAULT_CONTEXT: StoredProfileContext = { mode: "personal" };

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function MobileProfileContextProvider({ children }: { children: React.ReactNode }) {
  const memberships = useQuery(api.bands.listMyBands);
  const [state, setState] = useState<StoredProfileContext>(DEFAULT_CONTEXT);
  const [isHydrated, setIsHydrated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.profileContext);
        if (!active) return;

        if (!raw) {
          setState(DEFAULT_CONTEXT);
          return;
        }

        const parsed = JSON.parse(raw) as StoredProfileContext;
        if (parsed.mode === "band" && parsed.bandId) {
          setState(parsed);
          return;
        }

        setState(DEFAULT_CONTEXT);
      } catch {
        if (active) {
          setState(DEFAULT_CONTEXT);
        }
      } finally {
        if (active) {
          setIsHydrated(true);
        }
      }
    }

    void hydrate();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    void AsyncStorage.setItem(STORAGE_KEYS.profileContext, JSON.stringify(state)).catch(() => {
      // Ignore storage persistence errors.
    });
  }, [isHydrated, state]);

  const setPersonalMode = useCallback(() => {
    setState(DEFAULT_CONTEXT);
    setNotice(null);
  }, []);

  const setBandMode = useCallback((bandId: Id<"bands">) => {
    setState({ mode: "band", bandId });
    setNotice(null);
  }, []);

  const clearNotice = useCallback(() => {
    setNotice(null);
  }, []);

  const bands = useMemo(() => (memberships ?? []) as BandMembershipEntry[], [memberships]);

  useEffect(() => {
    if (!isHydrated || memberships === undefined) return;

    if (state.mode === "band" && state.bandId) {
      const stillMember = bands.some((entry) => entry.band._id === state.bandId);
      if (!stillMember) {
        setState(DEFAULT_CONTEXT);
        setNotice("Band access changed. Switched to Personal workspace.");
      }
    }
  }, [bands, isHydrated, memberships, state.bandId, state.mode]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const activeBand = useMemo(() => {
    if (state.mode !== "band" || !state.bandId) return null;
    return bands.find((entry) => entry.band._id === state.bandId)?.band ?? null;
  }, [bands, state.bandId, state.mode]);

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
    [activeBand, bands, isHydrated, memberships, notice, setBandMode, setPersonalMode, state.bandId, state.mode, clearNotice],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfileContext(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfileContext must be used within MobileProfileContextProvider");
  }
  return context;
}
