"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useAction, useMutation } from "convex/react";
import {
  composePersonalName,
  getPersonalNameValidationError,
  normalizePersonalNamePart,
  splitPersonalName,
} from "@ear-plug/shared/utils";
import { api } from "../../../../../convex/_generated/api";
import { BrandMark } from "@/components/branding/BrandLogo";
import { ResponsiveSheetModal } from "@/components/ui/ResponsiveSheetModal";
import { cn } from "@/lib/utils";

interface NameCompletionModalProps {
  isOpen: boolean;
}

export function NameCompletionModal({ isOpen }: NameCompletionModalProps) {
  const { user: clerkUser } = useUser();
  const updateClerkPersonalName = useAction(api.users.updateClerkPersonalName);
  const upsertUser = useMutation(api.users.upsertUser);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fallbackName = splitPersonalName(clerkUser?.fullName);
    setFirstName(clerkUser?.firstName ?? fallbackName.firstName);
    setLastName(clerkUser?.lastName ?? fallbackName.lastName);
    setError(null);
  }, [clerkUser?.firstName, clerkUser?.fullName, clerkUser?.lastName, isOpen]);

  const handleSubmit = async () => {
    if (!clerkUser) {
      setError("Your account is still loading. Try again in a moment.");
      return;
    }

    const validationError = getPersonalNameValidationError(firstName, lastName);
    if (validationError) {
      setError(validationError);
      return;
    }

    const normalizedFirstName = normalizePersonalNamePart(firstName);
    const normalizedLastName = normalizePersonalNamePart(lastName);

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
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "We couldn't save your name. Please try again."
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
      panelClassName="sm:max-w-md"
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
            Add your first and last name
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            EarPlug needs your real name before you can continue into the app.
          </p>
        </div>

        <div className="flex-1 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">
                First Name
              </span>
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="First name"
                autoComplete="given-name"
                className={cn(
                  "w-full rounded-xl border bg-muted/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fan/10",
                  error?.includes("First name")
                    ? "border-red-500/50 focus:border-red-500"
                    : "border-border focus:border-fan/50"
                )}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">
                Last Name
              </span>
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Last name"
                autoComplete="family-name"
                className={cn(
                  "w-full rounded-xl border bg-muted/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fan/10",
                  error?.includes("Last name")
                    ? "border-red-500/50 focus:border-red-500"
                    : "border-border focus:border-fan/50"
                )}
              />
            </label>
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
