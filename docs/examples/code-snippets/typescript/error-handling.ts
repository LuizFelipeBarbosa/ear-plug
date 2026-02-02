/**
 * Error Handling Patterns
 *
 * This file demonstrates patterns for handling errors in Convex queries
 * and mutations, including user-friendly error messages and recovery strategies.
 */

import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

// =============================================================================
// ERROR TYPES AND MESSAGES
// =============================================================================

/**
 * Common Convex error types and their user-friendly messages.
 * These match error messages thrown in Convex mutations.
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  "Not authenticated": "Please sign in to continue.",
  "User not found": "Your account wasn't found. Please sign in again.",

  // Authorization errors
  "Not authorized": "You don't have permission to do this.",
  "Not authorized to update this band": "You can only edit your own band.",
  "Not authorized to create events for this band": "You can only create events for your own band.",

  // Resource errors
  "Band not found": "This band no longer exists.",
  "Event not found": "This event no longer exists.",
  "Venue not found": "This venue no longer exists.",
  "Notification not found": "This notification no longer exists.",

  // Business logic errors
  "User already has a band": "You've already created a band profile.",
  "Already applied to this open date": "You've already applied for this date.",
  "This date is no longer available": "Sorry, this date has been filled.",
};

/**
 * Get a user-friendly error message from an error.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check if we have a custom message for this error
    const customMessage = ERROR_MESSAGES[error.message];
    if (customMessage) {
      return customMessage;
    }
    return error.message;
  }

  if (typeof error === "string") {
    return ERROR_MESSAGES[error] ?? error;
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Determine if an error is recoverable (user can retry).
 */
export function isRecoverableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  // Network errors are usually recoverable
  if (message.includes("network") || message.includes("timeout")) {
    return true;
  }

  // Auth errors might be recoverable by re-authenticating
  if (message === "Not authenticated") {
    return true;
  }

  // Business logic errors are usually not recoverable
  if (
    message.includes("already") ||
    message.includes("no longer") ||
    message.includes("Not authorized")
  ) {
    return false;
  }

  return true;
}

// =============================================================================
// PATTERN 1: Basic Error Handling Hook
// =============================================================================

/**
 * Hook that wraps a mutation with error handling.
 */
export function useSafeMutation<TArgs, TResult>(
  mutation: ReturnType<typeof useMutation>
) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = async (args: TArgs): Promise<TResult | null> => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await mutation(args);
      return result as TResult;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    execute,
    error,
    isLoading,
    clearError: () => setError(null),
    isRecoverable: error ? isRecoverableError(error) : false,
  };
}

// =============================================================================
// PATTERN 2: Error Boundary Helper
// =============================================================================

/**
 * Error types that can be caught and displayed inline vs
 * errors that should bubble up to an error boundary.
 */
export function shouldShowInline(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  // Validation and business logic errors should be shown inline
  const inlineErrors = [
    "Not authenticated",
    "User not found",
    "already",
    "required",
    "invalid",
    "too long",
    "too short",
  ];

  return inlineErrors.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Hook for components that want to handle some errors inline
 * and let others propagate to an error boundary.
 */
export function useErrorHandler() {
  const [inlineError, setInlineError] = useState<string | null>(null);

  const handleError = useCallback((error: unknown) => {
    if (shouldShowInline(error)) {
      setInlineError(getErrorMessage(error));
      return true; // Error was handled
    }
    return false; // Error should propagate
  }, []);

  const clearError = useCallback(() => {
    setInlineError(null);
  }, []);

  return {
    inlineError,
    handleError,
    clearError,
  };
}

// =============================================================================
// PATTERN 3: Retry Logic
// =============================================================================

/**
 * Hook with automatic retry for transient failures.
 */
export function useRetryMutation<TArgs extends object, TResult>(
  mutationFn: ReturnType<typeof useMutation>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    shouldRetry = isRecoverableError,
  } = options;

  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = async (args: TArgs): Promise<TResult | null> => {
    setError(null);
    setIsLoading(true);
    setAttempt(0);

    for (let i = 0; i < maxRetries; i++) {
      setAttempt(i + 1);

      try {
        const result = await mutationFn(args);
        setIsLoading(false);
        return result as TResult;
      } catch (err) {
        const isLastAttempt = i === maxRetries - 1;

        if (isLastAttempt || !shouldRetry(err)) {
          setError(getErrorMessage(err));
          setIsLoading(false);
          return null;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (i + 1)));
      }
    }

    setIsLoading(false);
    return null;
  };

  return {
    execute,
    error,
    isLoading,
    attempt,
    maxRetries,
  };
}

// =============================================================================
// PATTERN 4: Form Error State
// =============================================================================

/**
 * Comprehensive form error state management.
 */
export function useFormErrors() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setFieldError = (field: string, error: string | null) => {
    setFieldErrors((prev) => {
      if (error === null) {
        const { [field]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [field]: error };
    });
  };

  const clearFieldError = (field: string) => {
    setFieldError(field, null);
  };

  const clearAllErrors = () => {
    setFieldErrors({});
    setSubmitError(null);
  };

  const handleSubmitError = (error: unknown) => {
    const message = getErrorMessage(error);

    // Try to extract field-specific errors
    // Format: "fieldName: error message"
    const fieldMatch = message.match(/^(\w+):\s*(.+)$/);
    if (fieldMatch) {
      setFieldError(fieldMatch[1], fieldMatch[2]);
      return;
    }

    // Otherwise, set as general submit error
    setSubmitError(message);
  };

  return {
    fieldErrors,
    submitError,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    handleSubmitError,
    hasErrors: Object.keys(fieldErrors).length > 0 || submitError !== null,
    getFieldError: (field: string) => fieldErrors[field] ?? null,
  };
}

// =============================================================================
// PATTERN 5: Query Error Handling
// =============================================================================

/**
 * Hook for handling query errors gracefully.
 * Note: Convex queries don't throw - they return data or undefined.
 * This pattern is for handling unexpected data states.
 */
export function useSafeQuery<T>(
  queryResult: T | undefined,
  options: {
    required?: boolean;
    loadingMessage?: string;
    notFoundMessage?: string;
  } = {}
) {
  const {
    required = false,
    loadingMessage = "Loading...",
    notFoundMessage = "Not found",
  } = options;

  const isLoading = queryResult === undefined;
  const isEmpty = queryResult === null || (Array.isArray(queryResult) && queryResult.length === 0);
  const hasData = !isLoading && !isEmpty;

  let error: string | null = null;

  if (!isLoading && required && isEmpty) {
    error = notFoundMessage;
  }

  return {
    data: queryResult,
    isLoading,
    isEmpty,
    hasData,
    error,
    // Helper for rendering
    state: isLoading
      ? ("loading" as const)
      : error
        ? ("error" as const)
        : isEmpty
          ? ("empty" as const)
          : ("success" as const),
  };
}

// =============================================================================
// PATTERN 6: Global Error Toast
// =============================================================================

/**
 * Simple error notification system.
 * In a real app, you'd connect this to a toast library.
 */
interface ErrorNotification {
  id: string;
  message: string;
  type: "error" | "warning" | "info";
  dismissable: boolean;
  timestamp: number;
}

export function useErrorNotifications() {
  const [notifications, setNotifications] = useState<ErrorNotification[]>([]);

  const addNotification = useCallback(
    (
      message: string,
      options: {
        type?: "error" | "warning" | "info";
        dismissable?: boolean;
        duration?: number;
      } = {}
    ) => {
      const { type = "error", dismissable = true, duration = 5000 } = options;

      const notification: ErrorNotification = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message,
        type,
        dismissable,
        timestamp: Date.now(),
      };

      setNotifications((prev) => [...prev, notification]);

      // Auto-dismiss after duration
      if (duration > 0) {
        setTimeout(() => {
          removeNotification(notification.id);
        }, duration);
      }

      return notification.id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Helper to show error from any source
  const showError = useCallback(
    (error: unknown) => {
      return addNotification(getErrorMessage(error), { type: "error" });
    },
    [addNotification]
  );

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    showError,
    hasNotifications: notifications.length > 0,
  };
}

// =============================================================================
// PATTERN 7: Async Error Wrapper
// =============================================================================

/**
 * Higher-order function to wrap async operations with error handling.
 */
export function withErrorHandling<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  onError?: (error: unknown) => void
) {
  return async (...args: TArgs): Promise<TResult | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      onError?.(error);
      console.error("Operation failed:", error);
      return null;
    }
  };
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type { ErrorNotification };
