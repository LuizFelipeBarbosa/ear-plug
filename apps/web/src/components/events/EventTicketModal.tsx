"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  Download,
  RefreshCw,
  Ticket,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ResponsiveSheetModal } from "@/components/ui/ResponsiveSheetModal";
import { cn } from "@/lib/utils";
import { downloadTicketPdf } from "@/lib/tickets/downloadTicketPdf";
import { getTicketQrDataUrl } from "@/lib/tickets/getTicketQrDataUrl";
import type {
  MyEventTicketPayload,
  TicketStatus,
} from "@ear-plug/shared/types";

interface EventTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketPayload: MyEventTicketPayload | null;
  isLoading: boolean;
  onEnsureTicket?: () => Promise<unknown>;
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusConfig(status: TicketStatus) {
  switch (status) {
    case "active":
      return {
        label: "Active",
        color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
        icon: Check,
      };
    case "used":
      return {
        label: "Used",
        color: "bg-muted text-muted-foreground border-border",
        icon: Check,
      };
    case "revoked":
      return {
        label: "Revoked",
        color: "bg-red-500/15 text-red-500 border-red-500/30",
        icon: AlertCircle,
      };
    default:
      return {
        label: "Unknown",
        color: "bg-muted text-muted-foreground border-border",
        icon: AlertCircle,
      };
  }
}

function TicketMeta({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-medium text-foreground",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function EventTicketModal({
  isOpen,
  onClose,
  ticketPayload,
  isLoading,
  onEnsureTicket,
}: EventTicketModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [downloadPending, setDownloadPending] = useState(false);
  const [ensurePending, setEnsurePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ticket = ticketPayload?.ticket ?? null;
  const qrValue = ticket?.qrValue ?? null;
  const config = ticket ? statusConfig(ticket.status) : null;

  useEffect(() => {
    let cancelled = false;

    setError(null);

    if (!isOpen || !qrValue) {
      setQrDataUrl(null);
      return;
    }

    void getTicketQrDataUrl(qrValue)
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to generate QR code");
          setQrDataUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, qrValue]);

  const handleDownloadPdf = async () => {
    if (!ticketPayload || !ticketPayload.ticket?.qrValue) {
      return;
    }

    setError(null);
    setDownloadPending(true);

    try {
      await downloadTicketPdf(ticketPayload);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to download ticket",
      );
    } finally {
      setDownloadPending(false);
    }
  };

  const handleEnsureTicket = async () => {
    if (!onEnsureTicket) return;

    setEnsurePending(true);
    setError(null);

    try {
      await onEnsureTicket();
    } catch (ensureError) {
      setError(
        ensureError instanceof Error
          ? ensureError.message
          : "Failed to generate ticket",
      );
    } finally {
      setEnsurePending(false);
    }
  };

  return (
    <ResponsiveSheetModal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="event-ticket-modal-title"
      panelClassName="sm:max-w-xl"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-fan/20 bg-fan/10">
            <Ticket className="h-5 w-5 text-fan" />
          </div>
          <div>
            <h2
              id="event-ticket-modal-title"
              className="text-base font-semibold text-foreground"
            >
              Your Ticket
            </h2>
            <p className="text-sm text-muted-foreground">
              Download it or show the QR at the door
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close ticket"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-72 animate-shimmer rounded-[2rem] border border-border bg-muted" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-20 animate-shimmer rounded-2xl border border-border bg-muted" />
              <div className="h-20 animate-shimmer rounded-2xl border border-border bg-muted" />
              <div className="h-20 animate-shimmer rounded-2xl border border-border bg-muted" />
              <div className="h-20 animate-shimmer rounded-2xl border border-border bg-muted" />
            </div>
          </div>
        ) : !ticketPayload ? (
          <div className="rounded-3xl border border-border bg-card p-5 text-center">
            <p className="text-base font-semibold text-foreground">
              Ticket unavailable
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              RSVP to this event to access your ticket.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {ticketPayload.requiresTicketBootstrap && !ticket ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
                Ticket is still being prepared for this RSVP.
              </div>
            ) : null}

            {ticket ? (
              <>
                <section className="rounded-[2rem] border border-fan/20 bg-gradient-to-br from-fan/8 via-card to-band/8 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.18em] text-fan">
                        Admit One
                      </p>
                      <h3 className="mt-2 text-xl font-bold leading-tight text-foreground">
                        {ticketPayload.eventTitle}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Issued to {ticketPayload.attendeeName}
                      </p>
                    </div>

                    {config ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                          config.color,
                        )}
                      >
                        <config.icon className="h-3 w-3" />
                        {config.label}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 rounded-[1.5rem] bg-white p-4 shadow-inner">
                    {qrDataUrl ? (
                      <Image
                        src={qrDataUrl}
                        alt="Ticket QR code"
                        width={320}
                        height={320}
                        unoptimized
                        className={cn(
                          "mx-auto aspect-square w-full max-w-[320px]",
                          ticket.status !== "active" && "opacity-40 grayscale",
                        )}
                      />
                    ) : (
                      <div className="flex min-h-[320px] items-center justify-center text-center text-muted-foreground">
                        <div>
                          <Ticket className="mx-auto mb-3 h-10 w-10 opacity-40" />
                          <p className="text-sm">
                            {ticket.status === "active"
                              ? "Generating your QR code..."
                              : "QR code unavailable"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {ticket.status !== "active" ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      {ticket.status === "used"
                        ? "This ticket has already been checked in."
                        : "This ticket has been revoked."}
                    </p>
                  ) : null}
                </section>

                <div className="grid gap-3 sm:grid-cols-2">
                  <TicketMeta label="Attendee" value={ticketPayload.attendeeName} />
                  <TicketMeta
                    label="Date"
                    value={formatDateTime(ticketPayload.eventDateTime)}
                  />
                  <TicketMeta
                    label="Venue"
                    value={
                      ticketPayload.venue
                        ? `${ticketPayload.venue.name}`
                        : "Venue TBA"
                    }
                  />
                  <TicketMeta
                    label="Ticket Code"
                    value={ticket.ticketCode}
                    mono
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={!ticket.qrValue || downloadPending}
                    onClick={handleDownloadPdf}
                    className={cn(
                      "inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors",
                      ticket.qrValue
                        ? "bg-fan text-white hover:bg-fan/90"
                        : "cursor-not-allowed bg-muted text-muted-foreground",
                    )}
                  >
                    <Download className="h-4 w-4" />
                    {downloadPending ? "Preparing..." : "Download Ticket"}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-border bg-card p-5 text-center">
                <p className="text-base font-semibold text-foreground">
                  Ticket not available yet
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  We&apos;re still preparing your ticket for this RSVP.
                </p>

                {onEnsureTicket ? (
                  <button
                    type="button"
                    disabled={ensurePending}
                    onClick={handleEnsureTicket}
                    className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-fan px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-fan/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      className={cn("h-4 w-4", ensurePending && "animate-spin")}
                    />
                    {ensurePending ? "Generating..." : "Generate Ticket"}
                  </button>
                ) : null}
              </div>
            )}

            <AnimatePresence>
              {error ? (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500"
                >
                  {error}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        )}
      </div>
    </ResponsiveSheetModal>
  );
}
