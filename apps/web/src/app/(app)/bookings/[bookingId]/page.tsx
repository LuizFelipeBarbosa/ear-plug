"use client";

// Force dynamic rendering to avoid Next.js 14.2.0 staticPathsWorker bug
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useBookingDetail, useBookingActions, useBookingMessages } from "@/hooks/useBookings";
import { useCurrentUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Send,
  AlertCircle,
  DollarSign,
  Edit3,
} from "lucide-react";
import Link from "next/link";
import { formatPrice, formatEventDate, formatEventTime, formatFullDate, getRelativeTime } from "@ear-plug/shared";
import { BOOKING_STATUS_CONFIG, EVENT_TYPES } from "@ear-plug/shared";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

export default function MusicianBookingDetailPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const { bookingId } = params;
  const router = useRouter();
  const { user, isMusician, isLoading: userLoading } = useCurrentUser();
  const { booking, conversation, messages, isLoading: bookingLoading } = useBookingDetail(
    bookingId as Id<"bookings">
  );
  const { accept, reject, updateQuote, cancel, complete } = useBookingActions();
  const { send, markAsRead } = useBookingMessages(conversation?._id);

  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [newQuote, setNewQuote] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [isUpdatingQuote, setIsUpdatingQuote] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLoading = userLoading || bookingLoading;

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversation && markAsRead) {
      markAsRead();
    }
  }, [conversation, markAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !send) return;

    setIsSending(true);
    try {
      await send(messageInput.trim());
      setMessageInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleAccept = async () => {
    if (!booking) return;

    setIsAccepting(true);
    try {
      await accept({ bookingId: booking._id as Id<"bookings"> });
    } catch (error) {
      console.error("Failed to accept booking:", error);
      alert("Failed to accept booking. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!booking) return;

    setIsRejecting(true);
    try {
      await reject({
        bookingId: booking._id as Id<"bookings">,
        reason: rejectReason || undefined,
      });
      router.push("/bookings");
    } catch (error) {
      console.error("Failed to reject booking:", error);
      alert("Failed to reject booking. Please try again.");
    } finally {
      setIsRejecting(false);
      setShowRejectConfirm(false);
    }
  };

  const handleUpdateQuote = async () => {
    if (!booking || !newQuote) return;

    setIsUpdatingQuote(true);
    try {
      await updateQuote({
        bookingId: booking._id as Id<"bookings">,
        newPriceInCents: Math.round(Number(newQuote) * 100),
        message: quoteNote || undefined,
      });
      setShowQuoteForm(false);
      setNewQuote("");
      setQuoteNote("");
    } catch (error) {
      console.error("Failed to update quote:", error);
      alert("Failed to update quote. Please try again.");
    } finally {
      setIsUpdatingQuote(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;

    setIsCancelling(true);
    try {
      await cancel({ bookingId: booking._id as Id<"bookings"> });
      router.push("/bookings");
    } catch (error) {
      console.error("Failed to cancel booking:", error);
      alert("Failed to cancel booking. Please try again.");
    } finally {
      setIsCancelling(false);
      setShowCancelConfirm(false);
    }
  };

  const handleComplete = async () => {
    if (!booking) return;

    setIsCompleting(true);
    try {
      await complete({ bookingId: booking._id as Id<"bookings"> });
    } catch (error) {
      console.error("Failed to complete booking:", error);
      alert("Failed to mark booking as complete. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-lime animate-pulse-lime" />
        </div>
      </div>
    );
  }

  if (!isMusician) {
    return (
      <div className="min-h-screen bg-night p-6">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 font-medium uppercase tracking-wider text-sm"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>
        <div className="text-center py-12 border-2 border-dashed border-zinc-800">
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight mb-2">
            Musicians Only
          </h1>
          <p className="text-zinc-400">This page is for musicians to manage bookings</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-night p-6">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 font-medium uppercase tracking-wider text-sm"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to bookings
        </Link>
        <div className="text-center py-12 border-2 border-dashed border-zinc-800">
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight mb-2">
            Booking Not Found
          </h1>
          <p className="text-zinc-400">This booking doesn&apos;t exist or you don&apos;t have access</p>
        </div>
      </div>
    );
  }

  const statusConfig =
    BOOKING_STATUS_CONFIG[booking.status as keyof typeof BOOKING_STATUS_CONFIG];
  const eventType = EVENT_TYPES.find((t) => t.value === booking.eventType);

  // Action states
  const isPending = booking.status === "pending";
  const isNegotiating = booking.status === "negotiating";
  const canRespond = isPending || isNegotiating;
  const isConfirmed = booking.status === "confirmed";
  const canComplete = isConfirmed && booking.eventDateTime < Date.now();
  const canCancel = !["completed", "cancelled", "rejected", "expired"].includes(
    booking.status
  );

  return (
    <div className="min-h-screen bg-night pb-24">
      {/* Header - Brutalist */}
      <div className="sticky top-0 z-40 bg-night-secondary border-b-2 border-lime/20">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link
            href="/bookings"
            className="w-10 h-10 bg-night-tertiary border-2 border-zinc-800 flex items-center justify-center text-white hover:border-lime transition-colors touch-target"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white uppercase tracking-tight truncate">
              {booking.eventName}
            </h1>
            <p className="text-sm text-zinc-400">From {booking.fan?.name || "Fan"}</p>
          </div>
          <span
            className={cn(
              "px-2 py-1 text-xs font-bold uppercase tracking-wider",
              statusConfig?.bgColor,
              statusConfig?.color
            )}
          >
            {statusConfig?.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Action Required Banner */}
        {canRespond && (
          <div className="bg-amber-500/10 border-2 border-amber-500/30 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-200 font-bold uppercase tracking-wider text-sm">
                  {isPending ? "New Booking Request" : "Negotiation in Progress"}
                </p>
                <p className="text-sm text-amber-200/70 mt-1">
                  {isPending
                    ? "Review the details and accept or decline this request"
                    : "The fan is waiting for your updated quote or response"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Accept/Reject Actions */}
        {canRespond && !showRejectConfirm && !showQuoteForm && (
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="flex-1 py-3 bg-lime text-night font-bold uppercase tracking-wider border-2 border-lime hover:bg-transparent hover:text-lime transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {isAccepting ? "Accepting..." : "Accept"}
            </button>
            <button
              onClick={() => setShowQuoteForm(true)}
              className="flex-1 py-3 bg-night-tertiary text-white font-bold uppercase tracking-wider border-2 border-zinc-800 hover:border-lime transition-colors flex items-center justify-center gap-2"
            >
              <Edit3 className="w-5 h-5" />
              Counter Offer
            </button>
            <button
              onClick={() => setShowRejectConfirm(true)}
              className="py-3 px-4 bg-night-tertiary text-red-400 border-2 border-red-400/30 hover:bg-red-400/10 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Quote Form */}
        {showQuoteForm && (
          <div className="bg-night-secondary border-2 border-zinc-800 p-4 space-y-4">
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Update Quote</h3>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
                New Total Price ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newQuote}
                  onChange={(e) => setNewQuote(e.target.value)}
                  placeholder={String(booking.totalPriceInCents / 100)}
                  className="w-full pl-9 pr-3 py-3 bg-night-tertiary border-2 border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime transition-colors"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
                Current quote: {formatPrice(booking.totalPriceInCents)}
              </p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
                Note to Fan (optional)
              </label>
              <textarea
                value={quoteNote}
                onChange={(e) => setQuoteNote(e.target.value)}
                placeholder="Explain the price adjustment..."
                rows={2}
                className="w-full px-4 py-3 bg-night-tertiary border-2 border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime transition-colors resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowQuoteForm(false);
                  setNewQuote("");
                  setQuoteNote("");
                }}
                className="flex-1 py-2 bg-night-tertiary text-zinc-300 font-bold uppercase tracking-wider text-sm border-2 border-zinc-800 hover:border-zinc-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateQuote}
                disabled={!newQuote || isUpdatingQuote}
                className="flex-1 py-2 bg-lime text-night font-bold uppercase tracking-wider text-sm border-2 border-lime hover:bg-transparent hover:text-lime transition-colors disabled:opacity-50"
              >
                {isUpdatingQuote ? "Sending..." : "Send Quote"}
              </button>
            </div>
          </div>
        )}

        {/* Reject Confirmation */}
        {showRejectConfirm && (
          <div className="bg-night-secondary border-2 border-red-400/30 p-4 space-y-4">
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Decline Booking</h3>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
                Reason (optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Let them know why you can't accept..."
                rows={2}
                className="w-full px-4 py-3 bg-night-tertiary border-2 border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime transition-colors resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRejectConfirm(false);
                  setRejectReason("");
                }}
                className="flex-1 py-2 bg-night-tertiary text-zinc-300 font-bold uppercase tracking-wider text-sm border-2 border-zinc-800 hover:border-zinc-600 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleReject}
                disabled={isRejecting}
                className="flex-1 py-2 bg-red-500 text-white font-bold uppercase tracking-wider text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isRejecting ? "Declining..." : "Decline Request"}
              </button>
            </div>
          </div>
        )}

        {/* Complete Booking */}
        {canComplete && (
          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className="w-full py-3 bg-lime text-night font-bold uppercase tracking-wider border-2 border-lime hover:bg-transparent hover:text-lime transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            {isCompleting ? "Completing..." : "Mark as Completed"}
          </button>
        )}

        {/* Fan Info */}
        <div className="bg-night-secondary border-2 border-zinc-800 p-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-tight mb-3">Client</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-night-tertiary border-2 border-zinc-800 flex items-center justify-center">
              <Users className="w-6 h-6 text-zinc-500" />
            </div>
            <div>
              <p className="text-white font-bold">{booking.fan?.name || "Fan"}</p>
              {booking.fan?.email && (
                <p className="text-sm text-zinc-400">{booking.fan.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div className="bg-night-secondary border-2 border-zinc-800 p-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-tight mb-4">Event Details</h2>

          <div className="space-y-3">
            {eventType && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-lime/20 border border-lime/30 flex items-center justify-center">
                  <span className="text-sm text-lime font-bold">{eventType.label.charAt(0)}</span>
                </div>
                <p className="text-white font-medium">{eventType.label}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="text-white font-medium">{formatFullDate(booking.eventDateTime)}</p>
                <p className="text-sm text-zinc-400">
                  {formatEventTime(booking.eventDateTime)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-zinc-500" />
              <p className="text-white">{booking.durationHours} hours</p>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="text-white">{booking.eventLocation}</p>
                {booking.eventCity && (
                  <p className="text-sm text-zinc-400">{booking.eventCity}</p>
                )}
              </div>
            </div>

            {booking.guestCount && (
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-zinc-500" />
                <p className="text-white">{booking.guestCount} guests</p>
              </div>
            )}

            {booking.eventDescription && (
              <div className="mt-4 pt-4 border-t-2 border-zinc-800">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Description</p>
                <p className="text-zinc-300 text-sm">{booking.eventDescription}</p>
              </div>
            )}

            {booking.specialRequests && (
              <div className="mt-4 pt-4 border-t-2 border-zinc-800">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Special Requests</p>
                <p className="text-zinc-300 text-sm">{booking.specialRequests}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-night-secondary border-2 border-zinc-800 p-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-tight mb-4">Payment</h2>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-400">Total Quote</span>
              <span className="text-white font-bold">
                {formatPrice(booking.totalPriceInCents)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Deposit ({booking.listing?.depositPercentage || 25}%)</span>
              <span className="text-zinc-300">
                {formatPrice(booking.depositAmountInCents)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t-2 border-zinc-800">
              <span className="text-zinc-400">Received</span>
              <span className="text-green-400 font-bold">
                {formatPrice(booking.paidAmountInCents)}
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-night-secondary border-2 border-zinc-800 overflow-hidden">
          <div className="p-4 border-b-2 border-zinc-800">
            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Messages</h2>
          </div>

          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-center text-zinc-500 py-8 uppercase text-xs tracking-wider">
                No messages yet. Start a conversation!
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message._id}
                  className={cn(
                    "flex",
                    message.isCurrentUser ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] px-4 py-3",
                      message.isCurrentUser
                        ? "bg-lime text-night"
                        : message.messageType === "system"
                          ? "bg-night-tertiary text-zinc-400 text-sm italic border border-zinc-800"
                          : "bg-night-tertiary text-white border border-zinc-800"
                    )}
                  >
                    {!message.isCurrentUser && message.messageType !== "system" && (
                      <p className="text-xs text-zinc-400 mb-1 uppercase tracking-wider">
                        {message.sender.name}
                      </p>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={cn(
                        "text-xs mt-1 uppercase tracking-wider",
                        message.isCurrentUser ? "text-night/60" : "text-zinc-500"
                      )}
                    >
                      {getRelativeTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {!["completed", "cancelled", "rejected", "expired"].includes(
            booking.status
          ) && (
            <div className="p-4 border-t-2 border-zinc-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-night-tertiary border-2 border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime transition-colors"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isSending}
                  className="px-4 py-3 bg-lime text-night border-2 border-lime hover:bg-transparent hover:text-lime transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cancel Booking */}
        {canCancel && !showCancelConfirm && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="w-full py-2 text-red-400 font-bold uppercase tracking-wider text-sm border-2 border-red-400/30 hover:bg-red-400/10 transition-colors"
          >
            Cancel Booking
          </button>
        )}

        {showCancelConfirm && (
          <div className="bg-night-secondary border-2 border-red-400/30 p-4 space-y-4">
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Cancel Booking</h3>
            <p className="text-sm text-zinc-400">
              Are you sure you want to cancel this booking?
              {booking.paidAmountInCents > 0 &&
                " The fan will receive a full refund."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2 bg-night-tertiary text-zinc-300 font-bold uppercase tracking-wider text-sm border-2 border-zinc-800 hover:border-zinc-600 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex-1 py-2 bg-red-500 text-white font-bold uppercase tracking-wider text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isCancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
