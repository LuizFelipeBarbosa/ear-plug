"use client";

// Force dynamic rendering to avoid Next.js 14.2.0 staticPathsWorker bug
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useBookingDetail, useBookingActions, useBookingMessages, usePayments } from "@/hooks/useBookings";
import { useCurrentUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  MapPin,
  Music,
  DollarSign,
  Clock,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Send,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { formatPrice, formatEventDate, formatEventTime, formatFullDate, getRelativeTime } from "@ear-plug/shared";
import { BOOKING_STATUS_CONFIG, REFUND_POLICY } from "@ear-plug/shared";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

export default function BookingDetailPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const { bookingId } = params;
  const router = useRouter();
  const { user, isFan, isLoading: userLoading } = useCurrentUser();
  const { booking, conversation, messages, isLoading: bookingLoading } = useBookingDetail(
    bookingId as Id<"bookings">
  );
  const { cancel } = useBookingActions();
  const { send, markAsRead } = useBookingMessages(conversation?._id);
  const { createDepositIntent, createFinalPaymentIntent } = usePayments();

  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
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

  const handlePayDeposit = async () => {
    if (!booking) return;

    setIsProcessingPayment(true);
    try {
      const { clientSecret, amount } = await createDepositIntent({
        bookingId: booking._id as Id<"bookings">,
      });

      // In a real implementation, you would use Stripe Elements here
      // For now, we'll show an alert with the info
      alert(
        `Payment of ${formatPrice(amount)} would be processed using Stripe.\n\nClient Secret: ${clientSecret.slice(0, 20)}...`
      );
    } catch (error) {
      console.error("Failed to create payment:", error);
      alert("Failed to process payment. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePayFinal = async () => {
    if (!booking) return;

    setIsProcessingPayment(true);
    try {
      const { clientSecret, amount } = await createFinalPaymentIntent({
        bookingId: booking._id as Id<"bookings">,
      });

      alert(
        `Payment of ${formatPrice(amount)} would be processed using Stripe.\n\nClient Secret: ${clientSecret.slice(0, 20)}...`
      );
    } catch (error) {
      console.error("Failed to create payment:", error);
      alert("Failed to process payment. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;

    setIsCancelling(true);
    try {
      await cancel({ bookingId: booking._id as Id<"bookings"> });
      router.push("/my-bookings");
    } catch (error) {
      console.error("Failed to cancel booking:", error);
      alert("Failed to cancel booking. Please try again.");
    } finally {
      setIsCancelling(false);
      setShowCancelConfirm(false);
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

  if (!booking) {
    return (
      <div className="min-h-screen bg-night p-6">
        <Link
          href="/my-bookings"
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

  // Calculate payment states
  const canPayDeposit = booking.status === "accepted" && booking.paidAmountInCents === 0;
  const canPayFinal =
    booking.status === "deposit_paid" &&
    booking.paidAmountInCents < booking.totalPriceInCents;
  const remainingBalance = booking.totalPriceInCents - booking.paidAmountInCents;

  // Calculate refund policy for cancellation
  const now = Date.now();
  const daysUntilEvent = Math.floor(
    (booking.eventDateTime - now) / (1000 * 60 * 60 * 24)
  );

  let refundPercentage = 0;
  if (daysUntilEvent > REFUND_POLICY.FULL_REFUND_DAYS) {
    refundPercentage = 100;
  } else if (daysUntilEvent > REFUND_POLICY.PARTIAL_REFUND_DAYS) {
    refundPercentage = REFUND_POLICY.PARTIAL_REFUND_PERCENTAGE;
  }

  const canCancel = !["completed", "cancelled", "rejected", "expired"].includes(
    booking.status
  );

  return (
    <div className="min-h-screen bg-night pb-24">
      {/* Header - Brutalist */}
      <div className="sticky top-0 z-40 bg-night-secondary border-b-2 border-lime/20">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link
            href="/my-bookings"
            className="w-10 h-10 bg-night-tertiary border-2 border-zinc-800 flex items-center justify-center text-white hover:border-lime transition-colors touch-target"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white uppercase tracking-tight truncate">
              {booking.eventName}
            </h1>
            <p className="text-sm text-zinc-400">{booking.band?.name}</p>
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
        {/* Status Message */}
        {statusConfig?.description && (
          <div className="bg-night-secondary border-2 border-zinc-800 p-4">
            <p className="text-zinc-300 text-sm">{statusConfig.description}</p>
          </div>
        )}

        {/* Payment Action */}
        {(canPayDeposit || canPayFinal) && (
          <div className="bg-amber-500/10 border-2 border-amber-500/30 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-200 font-bold uppercase tracking-wider text-sm">
                  {canPayDeposit ? "Deposit Payment Required" : "Final Payment Due"}
                </p>
                <p className="text-sm text-amber-200/70 mt-1">
                  {canPayDeposit
                    ? `Pay ${formatPrice(booking.depositAmountInCents)} to secure your booking`
                    : `Pay remaining ${formatPrice(remainingBalance)} to confirm your booking`}
                </p>
                <button
                  onClick={canPayDeposit ? handlePayDeposit : handlePayFinal}
                  disabled={isProcessingPayment}
                  className="mt-3 px-4 py-2 bg-lime text-night font-bold uppercase tracking-wider text-sm border-2 border-lime hover:bg-transparent hover:text-lime transition-colors disabled:opacity-50"
                >
                  {isProcessingPayment
                    ? "Processing..."
                    : `Pay ${formatPrice(canPayDeposit ? booking.depositAmountInCents : remainingBalance)}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event Details */}
        <div className="bg-night-secondary border-2 border-zinc-800 p-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-tight mb-4">Event Details</h2>

          <div className="space-y-3">
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
              <span className="text-zinc-400">Total</span>
              <span className="text-white font-bold">
                {formatPrice(booking.totalPriceInCents)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Paid</span>
              <span className="text-green-400 font-bold">
                {formatPrice(booking.paidAmountInCents)}
              </span>
            </div>
            {remainingBalance > 0 && (
              <div className="flex justify-between pt-2 border-t-2 border-zinc-800">
                <span className="text-zinc-300">Remaining</span>
                <span className="text-lime font-bold">
                  {formatPrice(remainingBalance)}
                </span>
              </div>
            )}
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
        {canCancel && (
          <div className="bg-night-secondary border-2 border-zinc-800 p-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-tight mb-2">
              Cancel Booking
            </h2>
            {booking.paidAmountInCents > 0 ? (
              <p className="text-sm text-zinc-400 mb-4">
                {refundPercentage === 100
                  ? "Full refund available (more than 30 days until event)"
                  : refundPercentage === 50
                    ? "50% refund available (14-30 days until event)"
                    : "No refund available (less than 14 days until event)"}
              </p>
            ) : (
              <p className="text-sm text-zinc-400 mb-4">
                Cancel your booking request
              </p>
            )}

            {!showCancelConfirm ? (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full py-2 text-red-400 font-bold uppercase tracking-wider text-sm border-2 border-red-400/30 hover:bg-red-400/10 transition-colors"
              >
                Cancel Booking
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-zinc-300">
                  Are you sure you want to cancel this booking?
                  {booking.paidAmountInCents > 0 &&
                    ` You will receive a ${refundPercentage}% refund (${formatPrice(
                      Math.round(
                        (booking.paidAmountInCents * refundPercentage) / 100
                      )
                    )}).`}
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
        )}
      </div>
    </div>
  );
}
