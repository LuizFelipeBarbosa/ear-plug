"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Download, QrCode, RefreshCw, Ticket, Check, AlertCircle, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { downloadTicketPdf } from "@/lib/tickets/downloadTicketPdf";
import { getTicketQrDataUrl } from "@/lib/tickets/getTicketQrDataUrl";
import type {
  MyEventTicketPayload,
  TicketStatus,
} from "@ear-plug/shared/types";

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
  const [showFullQr, setShowFullQr] = useState(false);

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
          setError("Failed to generate QR code");
          setQrDataUrl(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [qrValue]);

  const config = useMemo(() => {
    if (!ticket) return null;
    return statusConfig(ticket.status);
  }, [ticket]);

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
          : "Failed to download ticket"
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
          : "Failed to generate ticket"
      );
    } finally {
      setEnsurePending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mb-6 h-64 bg-card border border-border rounded-2xl animate-shimmer" />
    );
  }

  if (!ticketPayload) {
    return null;
  }

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "mb-6 bg-gradient-to-br from-fan/5 via-fan/[0.02] to-transparent border border-fan/20 rounded-2xl overflow-hidden",
          compact ? "p-4" : "p-5"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-fan/10 border border-fan/20 rounded-lg flex items-center justify-center">
              <Ticket className="w-4 h-4 text-fan" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Your Ticket
              </h2>
              <p className="text-xs text-muted-foreground">
                Show at the door
              </p>
            </div>
          </div>
          {ticket && config && (
            <span
              className={cn(
                "px-2.5 py-1 text-[10px] font-semibold border rounded-full flex items-center gap-1",
                config.color
              )}
            >
              <config.icon className="w-3 h-3" />
              {config.label}
            </span>
          )}
        </div>

        {/* Bootstrap notice */}
        {ticketPayload.requiresTicketBootstrap && !ticket && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-500">
            Ticket is being prepared for this RSVP...
          </div>
        )}

        {ticket ? (
          <div className="space-y-4">
            {/* QR Code */}
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowFullQr(true)}
                className="relative bg-card border border-border rounded-xl p-4 flex items-center justify-center min-h-[180px] sm:w-44 group"
              >
                {qrDataUrl ? (
                  <>
                    <Image
                      src={qrDataUrl}
                      alt="Ticket QR code"
                      width={140}
                      height={140}
                      unoptimized
                      className={cn(
                        "w-32 h-32 transition-opacity",
                        ticket.status !== "active" && "opacity-40 grayscale"
                      )}
                    />
                    {ticket.status === "active" && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/60 backdrop-blur-sm rounded-xl">
                        <span className="text-xs font-medium text-foreground">
                          Tap to enlarge
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <QrCode className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">
                      {ticket.status === "active"
                        ? "Generating..."
                        : "Unavailable"}
                    </p>
                  </div>
                )}
              </motion.button>

              {/* Ticket Details */}
              <div className="flex-1 space-y-2">
                <p className="font-bold text-foreground leading-tight">
                  {ticketPayload.eventTitle}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(ticketPayload.eventDateTime)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {ticketPayload.attendeeName}
                </p>
                {ticketPayload.venue && (
                  <p className="text-xs text-muted-foreground">
                    {ticketPayload.venue.name}
                  </p>
                )}
                <p className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded inline-block">
                  {ticket.ticketCode}
                </p>

                {ticket.status !== "active" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {ticket.status === "used"
                      ? "This ticket has already been checked in"
                      : "This ticket has been revoked"}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {showOpenTicketLink && (
                <Link
                  href={`/gig/${eventId}/ticket`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-fan text-white text-xs font-medium rounded-xl hover:bg-fan/90 transition-colors"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  Full Ticket
                </Link>
              )}
              <button
                type="button"
                disabled={!ticket.qrValue || downloadPending}
                onClick={handleDownloadPdf}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-xl transition-colors border",
                  ticket.qrValue
                    ? "border-border text-foreground hover:bg-muted"
                    : "border-border text-muted-foreground cursor-not-allowed"
                )}
              >
                <Download className="w-3.5 h-3.5" />
                {downloadPending ? "..." : "PDF"}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">
              Ticket not available yet
            </p>
            {onEnsureTicket && (
              <button
                type="button"
                disabled={ensurePending}
                onClick={handleEnsureTicket}
                className="inline-flex items-center gap-2 px-4 py-2 bg-fan text-white text-sm font-medium rounded-xl hover:bg-fan/90 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={cn("w-4 h-4", ensurePending && "animate-spin")}
                />
                {ensurePending ? "Generating..." : "Generate Ticket"}
              </button>
            )}
          </div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 text-xs text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Full Screen QR Modal */}
      <AnimatePresence>
        {showFullQr && qrDataUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center p-6"
            onClick={() => setShowFullQr(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-foreground">
                  {ticketPayload.eventTitle}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Show this code at the door
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 mb-6">
                <Image
                  src={qrDataUrl}
                  alt="Ticket QR code"
                  width={280}
                  height={280}
                  unoptimized
                  className="w-full h-auto"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{ticket?.ticketCode}</span>
                <button
                  onClick={() => setShowFullQr(false)}
                  className="px-4 py-2 bg-fan text-white font-medium rounded-xl"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
