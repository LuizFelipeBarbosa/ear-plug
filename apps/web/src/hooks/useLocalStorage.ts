"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook for persisting state in localStorage with SSR support
 * @param key - The localStorage key
 * @param initialValue - Default value if no stored value exists
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize from localStorage after mount (SSR-safe)
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
    setIsHydrated(true);
  }, [key]);

  // Wrapped setter that also persists to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook specifically for persisting user role
 */
export function useRolePersistence() {
  const [role, setRole, removeRole] = useLocalStorage<"fan" | "musician" | null>(
    "ear-plug-user-role",
    null
  );

  const [likedEvents, setLikedEvents, clearLikedEvents] = useLocalStorage<string[]>(
    "ear-plug-liked-events",
    []
  );

  const [rsvpEvents, setRsvpEvents, clearRsvpEvents] = useLocalStorage<string[]>(
    "ear-plug-rsvp-events",
    []
  );

  const addLikedEvent = useCallback(
    (eventId: string) => {
      setLikedEvents((prev) => {
        if (prev.includes(eventId)) return prev;
        return [...prev, eventId];
      });
    },
    [setLikedEvents]
  );

  const removeLikedEvent = useCallback(
    (eventId: string) => {
      setLikedEvents((prev) => prev.filter((id) => id !== eventId));
    },
    [setLikedEvents]
  );

  const addRsvpEvent = useCallback(
    (eventId: string) => {
      setRsvpEvents((prev) => {
        if (prev.includes(eventId)) return prev;
        return [...prev, eventId];
      });
    },
    [setRsvpEvents]
  );

  const removeRsvpEvent = useCallback(
    (eventId: string) => {
      setRsvpEvents((prev) => prev.filter((id) => id !== eventId));
    },
    [setRsvpEvents]
  );

  const isEventLiked = useCallback(
    (eventId: string) => likedEvents.includes(eventId),
    [likedEvents]
  );

  const isEventRsvp = useCallback(
    (eventId: string) => rsvpEvents.includes(eventId),
    [rsvpEvents]
  );

  const clearAllData = useCallback(() => {
    removeRole();
    clearLikedEvents();
    clearRsvpEvents();
  }, [removeRole, clearLikedEvents, clearRsvpEvents]);

  return {
    role,
    setRole,
    likedEvents,
    rsvpEvents,
    addLikedEvent,
    removeLikedEvent,
    addRsvpEvent,
    removeRsvpEvent,
    isEventLiked,
    isEventRsvp,
    clearAllData,
  };
}
