"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageSquareText, X } from "lucide-react";
import { ResponsiveSheetModal } from "@/components/ui/ResponsiveSheetModal";
import { cn } from "@/lib/utils";
import type { EventPoll } from "@ear-plug/shared/types";

interface EventPollPromptProps {
  isOpen: boolean;
  eventTitle: string;
  question: string;
  options: EventPoll["options"];
  initialSelectedOptionId?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (optionId: string) => Promise<unknown> | unknown;
}

export function EventPollPrompt({
  isOpen,
  eventTitle,
  question,
  options,
  initialSelectedOptionId,
  isSubmitting = false,
  onClose,
  onSubmit,
}: EventPollPromptProps) {
  const [selectedOptionId, setSelectedOptionId] = useState(
    initialSelectedOptionId ?? "",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSubmitError(null);
      return;
    }

    setSelectedOptionId(initialSelectedOptionId ?? "");
    setSubmitError(null);
  }, [initialSelectedOptionId, isOpen]);

  const handleSubmit = async () => {
    if (!selectedOptionId) {
      setSubmitError("Choose an option before saving, or answer later.");
      return;
    }

    setSubmitError(null);
    try {
      await onSubmit(selectedOptionId);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save poll answer",
      );
    }
  };

  return (
    <ResponsiveSheetModal
      isOpen={isOpen}
      onClose={onClose}
      closeDisabled={isSubmitting}
      labelledBy="event-poll-title"
      panelClassName="sm:max-w-md"
    >
      <div className="border-b border-border bg-card/95 px-4 pb-4 pt-4 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-band/30 bg-band/10 text-band">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-semibold  tracking-[0.18em] text-muted-foreground">
                RSVP Poll
              </p>
              <h2
                id="event-poll-title"
                className="text-base font-bold text-foreground sm:text-lg"
              >
                {eventTitle}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Optional follow-up after RSVP. You can answer now or later.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="shrink-0 rounded-xl border border-border bg-muted p-2 text-muted-foreground transition-colors hover:border-band/30 hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4 sm:pb-6">
        <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground">{question}</p>
          <div className="mt-4 space-y-2">
            {options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSelectedOptionId(option.id);
                    setSubmitError(null);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                    isSelected
                      ? "border-band bg-band/10 text-foreground"
                      : "border-border bg-muted/50 text-muted-foreground hover:border-band/30 hover:text-foreground",
                  )}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border",
                      isSelected
                        ? "border-band bg-band text-white"
                        : "border-border bg-card",
                    )}
                  >
                    {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                  </span>
                </button>
              );
            })}
          </div>

          {submitError ? (
            <p className="mt-3 text-xs text-red-500">{submitError}</p>
          ) : null}
        </div>
      </div>

      <div className="safe-area-inset-bottom border-t border-border bg-card/95 px-4 pb-4 pt-3 backdrop-blur-xl">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-band py-3 font-medium text-white transition-colors hover:bg-band/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Answer"
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs font-medium text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
          >
            Answer later
          </button>
        </div>
      </div>
    </ResponsiveSheetModal>
  );
}
