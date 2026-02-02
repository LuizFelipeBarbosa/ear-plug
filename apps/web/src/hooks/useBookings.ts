/**
 * @fileoverview Custom hooks for booking management.
 * Provides access to bookings, booking actions, and payment processing.
 * @module hooks/useBookings
 */

"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Hook for accessing the current fan's bookings.
 *
 * @param status - Optional filter by booking status
 * @returns Object containing bookings and loading state
 *
 * @example
 * function MyBookingsPage() {
 *   const { bookings, isLoading } = useFanBookings();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       {bookings.map(booking => (
 *         <BookingCard key={booking._id} booking={booking} />
 *       ))}
 *     </div>
 *   );
 * }
 */
type BookingStatusFilter = "pending" | "negotiating" | "accepted" | "deposit_paid" | "confirmed" | "completed" | "cancelled" | "rejected" | "expired";

export function useFanBookings(status?: BookingStatusFilter) {
  const bookings = useQuery(api.bookings.listByFan, {
    status,
  });

  return {
    /** Array of bookings with band data */
    bookings: bookings ?? [],
    /** True while the query is loading */
    isLoading: bookings === undefined,
  };
}

/**
 * Hook for accessing the current band's bookings.
 *
 * @param status - Optional filter by booking status
 * @returns Object containing bookings and loading state
 *
 * @example
 * function BandBookingsPage() {
 *   const { bookings, isLoading, counts } = useBandBookings();
 *
 *   return (
 *     <div>
 *       <Badge>{counts.pending} pending</Badge>
 *       {bookings.map(booking => (
 *         <BookingRequestCard key={booking._id} booking={booking} />
 *       ))}
 *     </div>
 *   );
 * }
 */
export function useBandBookings(status?: BookingStatusFilter) {
  const bookings = useQuery(api.bookings.listByBand, {
    status,
  });

  const counts = useQuery(api.bookings.getCounts);

  return {
    /** Array of bookings with fan data */
    bookings: bookings ?? [],
    /** Booking counts by status category */
    counts: counts ?? { pending: 0, upcoming: 0, past: 0 },
    /** True while the query is loading */
    isLoading: bookings === undefined,
  };
}

/**
 * Hook for getting a single booking with full details.
 *
 * @param bookingId - The ID of the booking
 * @returns Object containing booking data and loading state
 *
 * @example
 * function BookingDetailPage({ bookingId }) {
 *   const { booking, isLoading, messages, transactions } = useBookingDetail(bookingId);
 *
 *   if (isLoading) return <Spinner />;
 *   if (!booking) return <NotFound />;
 *
 *   return (
 *     <BookingDetailView booking={booking} messages={messages} />
 *   );
 * }
 */
export function useBookingDetail(bookingId: Id<"bookings"> | undefined) {
  const booking = useQuery(
    api.bookings.getById,
    bookingId ? { bookingId } : "skip"
  );

  const conversation = useQuery(
    api.bookingMessages.getConversation,
    bookingId ? { bookingId } : "skip"
  );

  return {
    /** The booking with all related data */
    booking,
    /** The booking's conversation with messages */
    conversation,
    /** The messages in the conversation */
    messages: conversation?.messages ?? [],
    /** Transaction history */
    transactions: booking?.transactions ?? [],
    /** True while the query is loading */
    isLoading: booking === undefined,
  };
}

/**
 * Hook for booking action mutations (accept, reject, cancel, etc.).
 *
 * @returns Object containing booking action functions
 *
 * @example
 * function BookingActions({ bookingId }) {
 *   const { accept, reject, updateQuote, cancel } = useBookingActions();
 *
 *   return (
 *     <div>
 *       <button onClick={() => accept({ bookingId })}>Accept</button>
 *       <button onClick={() => reject({ bookingId, reason: "Unavailable" })}>
 *         Decline
 *       </button>
 *     </div>
 *   );
 * }
 */
export function useBookingActions() {
  const createBooking = useMutation(api.bookings.create);
  const acceptBooking = useMutation(api.bookings.accept);
  const rejectBooking = useMutation(api.bookings.reject);
  const updateQuote = useMutation(api.bookings.updateQuote);
  const cancelBooking = useMutation(api.bookings.cancel);
  const completeBooking = useMutation(api.bookings.complete);

  return {
    /** Create a new booking request */
    create: createBooking,
    /** Accept a booking request */
    accept: acceptBooking,
    /** Reject a booking request */
    reject: rejectBooking,
    /** Update the price quote for a booking */
    updateQuote,
    /** Cancel a booking */
    cancel: cancelBooking,
    /** Mark a booking as completed */
    complete: completeBooking,
  };
}

/**
 * Hook for booking messaging.
 *
 * @param conversationId - The ID of the conversation
 * @returns Object containing messaging functions
 */
export function useBookingMessages(conversationId: Id<"bookingConversations"> | undefined) {
  const sendMessage = useMutation(api.bookingMessages.send);
  const markAsRead = useMutation(api.bookingMessages.markAsRead);

  return {
    /** Send a message in the conversation */
    send: conversationId
      ? (content: string) => sendMessage({ conversationId, content })
      : undefined,
    /** Mark all messages as read */
    markAsRead: conversationId
      ? () => markAsRead({ conversationId })
      : undefined,
  };
}

/**
 * Hook for booking message conversations for the current user.
 *
 * @returns Object containing conversations and unread count
 */
export function useBookingConversations() {
  const bandConversations = useQuery(api.bookingMessages.getBandConversations, {});
  const fanConversations = useQuery(api.bookingMessages.getFanConversations, {});
  const unreadCount = useQuery(api.bookingMessages.getUnreadCount);

  return {
    /** Conversations for musicians */
    bandConversations: bandConversations ?? [],
    /** Conversations for fans */
    fanConversations: fanConversations ?? [],
    /** Total unread message count */
    unreadCount: unreadCount ?? 0,
    /** True while loading */
    isLoading: bandConversations === undefined && fanConversations === undefined,
  };
}

/**
 * Hook for payment processing.
 *
 * @returns Object containing payment action functions
 *
 * @example
 * function PaymentForm({ bookingId }) {
 *   const { createDepositIntent, createFinalPaymentIntent } = usePayments();
 *
 *   const handlePayDeposit = async () => {
 *     const { clientSecret, amount } = await createDepositIntent({ bookingId });
 *     // Use clientSecret with Stripe Elements
 *   };
 *
 *   return <button onClick={handlePayDeposit}>Pay Deposit</button>;
 * }
 */
export function usePayments() {
  const createDepositIntent = useAction(api.payments.createDepositIntent);
  const createFinalPaymentIntent = useAction(api.payments.createFinalPaymentIntent);
  const processRefund = useAction(api.payments.processRefund);

  return {
    /** Create a PaymentIntent for the deposit */
    createDepositIntent,
    /** Create a PaymentIntent for the final payment */
    createFinalPaymentIntent,
    /** Process a refund for a booking */
    processRefund,
  };
}

/**
 * Hook for getting transaction history for a booking.
 *
 * @param bookingId - The ID of the booking
 * @returns Object containing transaction history
 */
export function useTransactionHistory(bookingId: Id<"bookings"> | undefined) {
  const transactions = useQuery(
    api.payments.getTransactionHistory,
    bookingId ? { bookingId } : "skip"
  );

  return {
    /** Array of transactions */
    transactions: transactions ?? [],
    /** True while loading */
    isLoading: transactions === undefined,
  };
}
