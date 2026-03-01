"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Download, QrCode, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadTicketPdf } from "@/lib/tickets/downloadTicketPdf";
import { getTicketQrDataUrl } from "@/lib/tickets/getTicketQrDataUrl";
import type { MyEventTicketPayload, TicketStatus } from "@ear-plug/shared/types";

interface EventTicketPanelProps {
  eventId: string;
  ticketPayload: MyEventTicketPayload | null;
  isLoading: boolean;
  onEnsureTicket?: () => Promise<unknown>;
  showOpenTicketLink?: boolean;
  compact?: boolean;
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

function statusLabel(status: TicketStatus): string {
  if (status === "active") return "Active";
  if (status === "used") return "Used";
  return "Revoked";
}

export function EventTicketPanel({
  eventId,
  ticketPayload,
  isLoading,
  onEnsureTicket,
  showOpenTicketLink = true,
  compact = false,
}: EventTicketPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [downloadPending, setDownloadPending] = useState(false);
  const [ensurePending, setEnsurePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ticket = ticketPayload?.ticket ?? null;
  const qrValue = ticket?.qrValue;

  useEffect(() => {
    let cancelled = false;
    setError(null);

    if (!qrValue) {
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
          setError("Failed to generate QR preview.");
          setQrDataUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [qrValue]);

  const statusClasses = useMemo(() => {
    const status = ticket?.status;
    if (status === "used") {
      return "border-zinc-600 bg-zinc-800 text-zinc-200";
    }
    if (status === "revoked") {
      return "border-red-500/40 bg-red-500/10 text-red-300";
    }
    return "border-lime/40 bg-lime/10 text-lime";
  }, [ticket?.status]);

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
          : "Failed to download ticket PDF."
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
          : "Failed to generate ticket."
      );
    } finally {
      setEnsurePending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mb-6 h-64 border-2 border-zinc-800 bg-night-tertiary animate-shimmer" />
    );
  }

  if (!ticketPayload) {
    return null;
  }

  return (
    <section
      className={cn(
        "mb-6 border-2 border-zinc-800 bg-night-tertiary",
        compact ? "p-4" : "p-5"
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            My Ticket
          </h2>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-500 mt-1">
            Show this QR code at the door
          </p>
        </div>

        {ticket && (
          <span
            className={cn(
              "px-2 py-1 text-[10px] uppercase tracking-wider font-bold border",
              statusClasses
            )}
          >
            {statusLabel(ticket.status)}
          </span>
        )}
      </div>

      {ticketPayload.requiresTicketBootstrap && !ticket && (
        <div className="mb-4 border border-violet/40 bg-violet/10 p-3 text-xs uppercase tracking-wider text-violet">
          Ticket is being prepared for this RSVP.
        </div>
      )}

      {ticket ? (
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="bg-night-secondary border border-zinc-800 p-3 flex items-center justify-center min-h-[220px]">
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt="Event ticket QR code"
                width={190}
                height={190}
                unoptimized
                className={cn("w-full max-w-[190px] h-auto", ticket.status !== "active" && "opacity-35")}
              />
            ) : (
              <div className="text-center text-zinc-500 text-xs uppercase tracking-wider">
                <QrCode className="w-8 h-8 mx-auto mb-2" />
                {ticket.status === "active" ? "Generating QR" : "QR unavailable"}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-white text-lg font-bold leading-tight">{ticketPayload.eventTitle}</p>
            <p className="text-sm text-zinc-400">{formatDateTime(ticketPayload.eventDateTime)}</p>
            <p className="text-sm text-zinc-400">Attendee: {ticketPayload.attendeeName}</p>
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
              Ticket Code: {ticket.ticketCode}
            </p>
            {ticketPayload.venue && (
              <p className="text-sm text-zinc-400">
                {ticketPayload.venue.name} • {ticketPayload.venue.address}, {ticketPayload.venue.city}
              </p>
            )}

            {ticket.status !== "active" && (
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                {ticket.status === "used"
                  ? "Ticket already checked in. QR cannot be reused."
                  : "Ticket has been revoked and is no longer valid."}
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {showOpenTicketLink && (
                <Link
                  href={`/gig/${eventId}/ticket`}
                  className="px-3 py-2 border border-lime/40 text-lime text-xs font-bold uppercase tracking-wider hover:bg-lime hover:text-night transition-colors"
                >
                  Open Full Ticket
                </Link>
              )}

              <button
                type="button"
                disabled={!ticket.qrValue || downloadPending}
                onClick={handleDownloadPdf}
                className={cn(
                  "px-3 py-2 border text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2",
                  ticket.qrValue
                    ? "border-zinc-600 text-zinc-300 hover:border-zinc-400"
                    : "border-zinc-700 text-zinc-500 cursor-not-allowed"
                )}
              >
                <Download className="w-3.5 h-3.5" />
                {downloadPending ? "Downloading..." : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">Ticket not available yet.</p>
          {onEnsureTicket && (
            <button
              type="button"
              disabled={ensurePending}
              onClick={handleEnsureTicket}
              className="px-3 py-2 border border-lime/40 text-lime text-xs font-bold uppercase tracking-wider hover:bg-lime hover:text-night transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", ensurePending && "animate-spin")} />
              {ensurePending ? "Generating..." : "Generate Ticket"}
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs uppercase tracking-wider text-red-300">{error}</p>
      )}
    </section>
  );
}
