"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useAction, useMutation } from "convex/react";
import {
  composePersonalName,
  getProfileLocationValidationError,
  getPersonalNameValidationError,
  hasRequiredProfileLocation,
  normalizeProfileLocation,
  normalizePersonalNamePart,
  splitPersonalName,
} from "@ear-plug/shared/utils";
import { api } from "../../../../../convex/_generated/api";
import { BrandMark } from "@/components/branding/BrandLogo";
import { ResponsiveSheetModal } from "@/components/ui/ResponsiveSheetModal";
import { CityAutocomplete } from "@/components/ui/CityAutocomplete";
import { useCurrentUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";

interface NameCompletionModalProps {
  isOpen: boolean;
}

export function NameCompletionModal({ isOpen }: NameCompletionModalProps) {
  const { user: clerkUser } = useUser();
  const { user } = useCurrentUser();
  const updateClerkPersonalName = useAction(api.users.updateClerkPersonalName);
  const upsertUser = useMutation(api.users.upsertUser);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const fallbackName = splitPersonalName(clerkUser?.fullName);
      setFirstName(clerkUser?.firstName ?? fallbackName.firstName);
      setLastName(clerkUser?.lastName ?? fallbackName.lastName);
      setLocation(user?.location ?? "");
      setError(null);
      setTouched({});
    }
    wasOpenRef.current = isOpen;
  }, [
    clerkUser?.firstName,
    clerkUser?.fullName,
    clerkUser?.lastName,
    isOpen,
    user?.location,
  ]);

  const firstNameError =
    touched.firstName && normalizePersonalNamePart(firstName).length === 0
      ? "First name is required."
      : null;
  const lastNameError =
    touched.lastName && normalizePersonalNamePart(lastName).length === 0
      ? "Last name is required."
      : null;
  const locationError =
    touched.location && !hasRequiredProfileLocation(location)
      ? "Location is required."
      : null;

  const handleSubmit = async () => {
    if (!clerkUser) {
      setError("Your account is still loading. Try again in a moment.");
      return;
    }

    setTouched({
      firstName: true,
      lastName: true,
      location: true,
    });

    const validationError = getPersonalNameValidationError(firstName, lastName);
    if (validationError) {
      setError(validationError);
      return;
    }

    const locationValidationError = getProfileLocationValidationError(location);
    if (locationValidationError) {
      setError(locationValidationError);
      return;
    }

    const normalizedFirstName = normalizePersonalNamePart(firstName);
    const normalizedLastName = normalizePersonalNamePart(lastName);
    const normalizedLocation = normalizeProfileLocation(location);

    setIsSaving(true);
    setError(null);

    try {
      await updateClerkPersonalName({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
      });
      await clerkUser.reload();
      await upsertUser({
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber,
        name: composePersonalName(normalizedFirstName, normalizedLastName),
        avatar: clerkUser.imageUrl,
        location: normalizedLocation,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "We couldn't save your profile details. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ResponsiveSheetModal
      isOpen={isOpen}
      onClose={() => {}}
      closeDisabled
      labelledBy="name-completion-modal-title"
      panelClassName="sm:max-w-lg"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border bg-card/95 px-5 py-5 backdrop-blur-xl">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-muted/50 px-3 py-2">
            <BrandMark
              className="w-8"
              theme="auto"
              decorative
              sizes="32px"
            />
            <div className="text-left">
              <p className="text-[11px] font-semibold  tracking-[0.22em] text-fan/80">
                Complete Profile
              </p>
              <p className="text-[11px] text-muted-foreground">EarPlug account setup</p>
            </div>
          </div>
          <h2
            id="name-completion-modal-title"
            className="mt-2 text-xl font-bold text-foreground"
          >
            Add your name and location
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            EarPlug needs your real name and home city before you can continue into
            the app.
          </p>
        </div>

        <div className="flex-1 px-5 py-5">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  First Name
                </span>
                <input
                  type="text"
                  value={firstName}
                  onChange={(event) => {
                    setFirstName(event.target.value);
                    setTouched((prev) => ({ ...prev, firstName: true }));
                    if (error) {
                      setError(null);
                    }
                  }}
                  placeholder="First name"
                  autoComplete="given-name"
                  className={cn(
                    "w-full rounded-xl border bg-muted/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fan/10",
                    firstNameError
                      ? "border-red-500/50 focus:border-red-500"
                      : "border-border focus:border-fan/50"
                  )}
                />
                {firstNameError ? (
                  <p className="mt-1.5 text-xs text-red-500">{firstNameError}</p>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  Last Name
                </span>
                <input
                  type="text"
                  value={lastName}
                  onChange={(event) => {
                    setLastName(event.target.value);
                    setTouched((prev) => ({ ...prev, lastName: true }));
                    if (error) {
                      setError(null);
                    }
                  }}
                  placeholder="Last name"
                  autoComplete="family-name"
                  className={cn(
                    "w-full rounded-xl border bg-muted/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fan/10",
                    lastNameError
                      ? "border-red-500/50 focus:border-red-500"
                      : "border-border focus:border-fan/50"
                  )}
                />
                {lastNameError ? (
                  <p className="mt-1.5 text-xs text-red-500">{lastNameError}</p>
                ) : null}
              </label>
            </div>

            <CityAutocomplete
              value={location}
              onChange={(city) => {
                setLocation((city as string) || "");
                setTouched((prev) => ({ ...prev, location: true }));
                if (error) {
                  setError(null);
                }
              }}
              placeholder="e.g., San Francisco, CA"
              label="Location"
              required
              error={locationError ?? undefined}
            />
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : null}
        </div>

        <div className="border-t border-border bg-card/95 px-5 pb-5 pt-4 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className={cn(
              "touch-target flex w-full items-center justify-center rounded-xl bg-fan px-4 py-3.5 font-medium text-white transition-colors transition-shadow",
              isSaving
                ? "cursor-not-allowed opacity-70"
                : "shadow-lg shadow-fan/25 hover:bg-fan/90"
            )}
          >
            {isSaving ? "Saving..." : "Save and Continue"}
          </button>
        </div>
      </div>
    </ResponsiveSheetModal>
  );
}
