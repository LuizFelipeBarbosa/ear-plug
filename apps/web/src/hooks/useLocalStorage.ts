/**
 * @fileoverview Custom hooks for localStorage persistence with SSR support.
 * Provides type-safe storage with React state integration.
 * @module hooks/useLocalStorage
 */

"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Generic hook for persisting state in localStorage with SSR support.
 * Safely handles server-side rendering by initializing from localStorage after mount.
 *
 * @template T - The type of value to store
 * @param key - The localStorage key to use
 * @param initialValue - Default value if no stored value exists
 * @returns Tuple of [storedValue, setValue, removeValue]
 *
 * @example
 * function ThemeToggle() {
 *   const [theme, setTheme, removeTheme] = useLocalStorage<"light" | "dark">("theme", "light");
 *
 *   return (
 *     <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
 *       Current: {theme}
 *     </button>
 *   );
 * }
 *
 * @example
 * // With functional updates
 * const [count, setCount] = useLocalStorage("counter", 0);
 * setCount(prev => prev + 1);
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

  /**
   * Sets the stored value and persists to localStorage.
   * Accepts either a direct value or a function that receives the previous value.
   *
   * @param value - New value or function that computes new value from previous
   */
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

  /**
   * Removes the value from localStorage and resets to initial value.
   */
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
 * Specialized hook for persisting user role and event interactions.
 * Provides methods for managing liked events and RSVPs in localStorage.
 * Useful for persisting state before user authentication.
 *
 * @returns Object with role state and event interaction methods
 *
 * @example
 * function EventCard({ eventId }: { eventId: string }) {
 *   const { isEventLiked, addLikedEvent, removeLikedEvent } = useRolePersistence();
 *   const liked = isEventLiked(eventId);
 *
 *   return (
 *     <button onClick={() => liked ? removeLikedEvent(eventId) : addLikedEvent(eventId)}>
 *       {liked ? "Unlike" : "Like"}
 *     </button>
 *   );
 * }
 *
 * @example
 * // Managing user role before backend sync
 * function RoleSelector() {
 *   const { role, setRole, clearAllData } = useRolePersistence();
 *
 *   return (
 *     <div>
 *       <button onClick={() => setRole("fan")}>I'm a Fan</button>
 *       <button onClick={() => setRole("musician")}>I'm a Musician</button>
 *       <button onClick={clearAllData}>Clear Data</button>
 *     </div>
 *   );
 * }
 */
export function useRolePersistence() {
  /** User's selected role */
  const [role, setRole, removeRole] = useLocalStorage<"fan" | "musician" | null>(
    "ear-plug-user-role",
    null
  );

  /** Array of liked event IDs */
  const [likedEvents, setLikedEvents, clearLikedEvents] = useLocalStorage<string[]>(
    "ear-plug-liked-events",
    []
  );

  /** Array of RSVP'd event IDs */
  const [rsvpEvents, setRsvpEvents, clearRsvpEvents] = useLocalStorage<string[]>(
    "ear-plug-rsvp-events",
    []
  );

  /**
   * Adds an event to the liked list.
   * No-op if already liked.
   *
   * @param eventId - The event ID to add
   */
  const addLikedEvent = useCallback(
    (eventId: string) => {
      setLikedEvents((prev) => {
        if (prev.includes(eventId)) return prev;
        return [...prev, eventId];
      });
    },
    [setLikedEvents]
  );

  /**
   * Removes an event from the liked list.
   *
   * @param eventId - The event ID to remove
   */
  const removeLikedEvent = useCallback(
    (eventId: string) => {
      setLikedEvents((prev) => prev.filter((id) => id !== eventId));
    },
    [setLikedEvents]
  );

  /**
   * Adds an event to the RSVP list.
   * No-op if already RSVP'd.
   *
   * @param eventId - The event ID to add
   */
  const addRsvpEvent = useCallback(
    (eventId: string) => {
      setRsvpEvents((prev) => {
        if (prev.includes(eventId)) return prev;
        return [...prev, eventId];
      });
    },
    [setRsvpEvents]
  );

  /**
   * Removes an event from the RSVP list.
   *
   * @param eventId - The event ID to remove
   */
  const removeRsvpEvent = useCallback(
    (eventId: string) => {
      setRsvpEvents((prev) => prev.filter((id) => id !== eventId));
    },
    [setRsvpEvents]
  );

  /**
   * Checks if an event is in the liked list.
   *
   * @param eventId - The event ID to check
   * @returns True if the event is liked
   */
  const isEventLiked = useCallback(
    (eventId: string) => likedEvents.includes(eventId),
    [likedEvents]
  );

  /**
   * Checks if an event is in the RSVP list.
   *
   * @param eventId - The event ID to check
   * @returns True if the user has RSVP'd
   */
  const isEventRsvp = useCallback(
    (eventId: string) => rsvpEvents.includes(eventId),
    [rsvpEvents]
  );

  /**
   * Clears all persisted data (role, liked events, RSVPs).
   */
  const clearAllData = useCallback(() => {
    removeRole();
    clearLikedEvents();
    clearRsvpEvents();
  }, [removeRole, clearLikedEvents, clearRsvpEvents]);

  return {
    /** Current user role or null if not set */
    role,
    /** Sets the user role */
    setRole,
    /** Array of liked event IDs */
    likedEvents,
    /** Array of RSVP'd event IDs */
    rsvpEvents,
    /** Adds an event to liked list */
    addLikedEvent,
    /** Removes an event from liked list */
    removeLikedEvent,
    /** Adds an event to RSVP list */
    addRsvpEvent,
    /** Removes an event from RSVP list */
    removeRsvpEvent,
    /** Checks if event is liked */
    isEventLiked,
    /** Checks if event is RSVP'd */
    isEventRsvp,
    /** Clears all persisted data */
    clearAllData,
  };
}
