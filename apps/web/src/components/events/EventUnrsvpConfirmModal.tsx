"use client";

import { Loader2, TicketX, X } from "lucide-react";
import { ResponsiveSheetModal } from "@/components/ui/ResponsiveSheetModal";

interface EventUnrsvpConfirmModalProps {
  isOpen: boolean;
  eventTitle: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<unknown> | unknown;
}

export function EventUnrsvpConfirmModal({
  isOpen,
  eventTitle,
  isSubmitting = false,
  onClose,
  onConfirm,
}: EventUnrsvpConfirmModalProps) {
  return (
    <ResponsiveSheetModal
      isOpen={isOpen}
      onClose={onClose}
      closeDisabled={isSubmitting}
      labelledBy="event-unrsvp-title"
      panelClassName="sm:max-w-md"
    >
      <div className="border-b border-border bg-card/95 px-4 pb-4 pt-4 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-300/30 bg-rose-400/10 text-rose-200">
              <TicketX className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
                RSVP Confirmation
              </p>
              <h2
                id="event-unrsvp-title"
                className="text-base font-bold text-foreground sm:text-lg"
              >
                Cancel your RSVP?
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                You&apos;ll be removed from the guest list for {eventTitle} and your
                ticket access will be revoked.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="shrink-0 rounded-xl border border-border bg-muted p-2 text-muted-foreground transition-colors hover:border-rose-300/30 hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="px-4 pb-6 pt-4 sm:pb-5">
        <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Keep your RSVP if you still plan to attend. Cancel only if you want to
            give up your spot.
          </p>
        </div>
      </div>

      <div className="safe-area-inset-bottom border-t border-border bg-card/95 px-4 pb-6 pt-3 backdrop-blur-xl sm:pb-5">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-border bg-muted px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-foreground/15 hover:bg-muted/80 disabled:opacity-50"
          >
            Keep RSVP
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Canceling...
              </>
            ) : (
              "Cancel RSVP"
            )}
          </button>
        </div>
      </div>
    </ResponsiveSheetModal>
  );
}
