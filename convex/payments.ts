/**
 * @fileoverview Convex actions and mutations for Stripe payment processing.
 * Handles deposit and final payment creation, refunds, and transaction recording.
 * @module convex/payments
 */

import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";

/** Validator for transaction type */
const transactionTypeValidator = v.union(
  v.literal("deposit"),
  v.literal("final_payment"),
  v.literal("refund")
);

/** Validator for transaction status */
const transactionStatusValidator = v.union(
  v.literal("pending"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("refunded")
);

/**
 * Creates a Stripe PaymentIntent for the deposit payment.
 *
 * @param bookingId - The ID of the booking
 * @returns Object with PaymentIntent client secret and details
 * @throws Error if not authenticated, booking not found, or invalid status
 */
export const createDepositIntent = action({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args): Promise<{
    clientSecret: string;
    amount: number;
    transactionId: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Note: In actions, we need to use runQuery/runMutation for DB access
    const booking = await ctx.runQuery(internal.payments.getBookingForPayment, {
      bookingId: args.bookingId,
      clerkId: identity.subject,
    });

    if (!booking) {
      throw new Error("Booking not found or access denied");
    }

    if (booking.status !== "accepted") {
      throw new Error("Booking must be accepted before paying deposit");
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("Stripe is not configured");
    }

    // Import Stripe dynamically
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    });

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: booking.depositAmountInCents,
      currency: "usd",
      metadata: {
        bookingId: args.bookingId,
        type: "deposit",
        fanId: booking.fanId,
        bandId: booking.bandId,
      },
      description: `Deposit for booking: ${booking.eventName}`,
    });

    if (!paymentIntent.client_secret) {
      throw new Error("Failed to create payment intent");
    }

    // Record the pending transaction
    const transactionId = await ctx.runMutation(
      internal.payments.recordTransaction,
      {
        bookingId: args.bookingId,
        type: "deposit",
        amountInCents: booking.depositAmountInCents,
        stripePaymentIntentId: paymentIntent.id,
        status: "pending",
      }
    );

    return {
      clientSecret: paymentIntent.client_secret,
      amount: booking.depositAmountInCents,
      transactionId,
    };
  },
});

/**
 * Creates a Stripe PaymentIntent for the final payment.
 *
 * @param bookingId - The ID of the booking
 * @returns Object with PaymentIntent client secret and details
 * @throws Error if not authenticated, booking not found, or invalid status
 */
export const createFinalPaymentIntent = action({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args): Promise<{
    clientSecret: string;
    amount: number;
    transactionId: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const booking = await ctx.runQuery(internal.payments.getBookingForPayment, {
      bookingId: args.bookingId,
      clerkId: identity.subject,
    });

    if (!booking) {
      throw new Error("Booking not found or access denied");
    }

    if (booking.status !== "deposit_paid") {
      throw new Error("Deposit must be paid before final payment");
    }

    const remainingAmount =
      booking.totalPriceInCents - booking.paidAmountInCents;

    if (remainingAmount <= 0) {
      throw new Error("No remaining balance to pay");
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("Stripe is not configured");
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: remainingAmount,
      currency: "usd",
      metadata: {
        bookingId: args.bookingId,
        type: "final_payment",
        fanId: booking.fanId,
        bandId: booking.bandId,
      },
      description: `Final payment for booking: ${booking.eventName}`,
    });

    if (!paymentIntent.client_secret) {
      throw new Error("Failed to create payment intent");
    }

    const transactionId = await ctx.runMutation(
      internal.payments.recordTransaction,
      {
        bookingId: args.bookingId,
        type: "final_payment",
        amountInCents: remainingAmount,
        stripePaymentIntentId: paymentIntent.id,
        status: "pending",
      }
    );

    return {
      clientSecret: paymentIntent.client_secret,
      amount: remainingAmount,
      transactionId,
    };
  },
});

/**
 * Processes a refund for a booking.
 * Uses the refund policy based on time until event.
 *
 * @param bookingId - The ID of the booking
 * @returns Object with refund details
 * @throws Error if not authenticated, booking not found, or no payments to refund
 */
export const processRefund = action({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args): Promise<{
    refundedAmount: number;
    refundPercentage: number;
    transactionId: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const booking = await ctx.runQuery(internal.payments.getBookingForPayment, {
      bookingId: args.bookingId,
      clerkId: identity.subject,
    });

    if (!booking) {
      throw new Error("Booking not found or access denied");
    }

    if (booking.paidAmountInCents === 0) {
      throw new Error("No payments to refund");
    }

    // Calculate refund percentage based on time until event
    const now = Date.now();
    const daysUntilEvent = Math.floor(
      (booking.eventDateTime - now) / (1000 * 60 * 60 * 24)
    );

    let refundPercentage: number;
    if (daysUntilEvent > 30) {
      refundPercentage = 100; // Full refund
    } else if (daysUntilEvent > 14) {
      refundPercentage = 50; // 50% refund
    } else {
      refundPercentage = 0; // No refund
    }

    // If band cancelled, always full refund
    const band = await ctx.runQuery(internal.payments.getBandOwner, {
      bandId: booking.bandId,
    });
    if (band && band.clerkId === identity.subject) {
      refundPercentage = 100;
    }

    if (refundPercentage === 0) {
      throw new Error("Refund not available within 14 days of event");
    }

    const refundAmount = Math.round(
      (booking.paidAmountInCents * refundPercentage) / 100
    );

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("Stripe is not configured");
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    });

    // Get the successful payment intents for this booking
    const transactions = await ctx.runQuery(
      internal.payments.getSuccessfulTransactions,
      { bookingId: args.bookingId }
    );

    if (transactions.length === 0) {
      throw new Error("No successful payments found to refund");
    }

    // Refund each payment proportionally
    let totalRefunded = 0;
    const refundIds: string[] = [];

    for (const txn of transactions) {
      if (!txn.stripePaymentIntentId) continue;

      const txnRefundAmount = Math.round(
        (txn.amountInCents * refundPercentage) / 100
      );

      if (txnRefundAmount > 0) {
        const refund = await stripe.refunds.create({
          payment_intent: txn.stripePaymentIntentId,
          amount: txnRefundAmount,
        });

        refundIds.push(refund.id);
        totalRefunded += txnRefundAmount;

        // Mark transaction as refunded
        await ctx.runMutation(internal.payments.updateTransactionStatus, {
          transactionId: txn._id,
          status: "refunded",
        });
      }
    }

    // Record refund transaction
    const transactionId = await ctx.runMutation(
      internal.payments.recordTransaction,
      {
        bookingId: args.bookingId,
        type: "refund",
        amountInCents: totalRefunded,
        stripeRefundId: refundIds.join(","),
        status: "succeeded",
      }
    );

    // Update booking paid amount
    await ctx.runMutation(internal.payments.updateBookingAfterRefund, {
      bookingId: args.bookingId,
      refundedAmount: totalRefunded,
    });

    return {
      refundedAmount: totalRefunded,
      refundPercentage,
      transactionId,
    };
  },
});

/**
 * Internal mutation to record a transaction.
 *
 * @param bookingId - The booking ID
 * @param type - Transaction type
 * @param amountInCents - Amount in cents
 * @param stripePaymentIntentId - Optional Stripe PaymentIntent ID
 * @param stripeChargeId - Optional Stripe Charge ID
 * @param stripeRefundId - Optional Stripe Refund ID
 * @param status - Transaction status
 * @returns The new transaction's document ID
 * @internal
 */
export const recordTransaction = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    type: transactionTypeValidator,
    amountInCents: v.number(),
    stripePaymentIntentId: v.optional(v.string()),
    stripeChargeId: v.optional(v.string()),
    stripeRefundId: v.optional(v.string()),
    status: transactionStatusValidator,
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("transactions", {
      bookingId: args.bookingId,
      type: args.type,
      amountInCents: args.amountInCents,
      stripePaymentIntentId: args.stripePaymentIntentId,
      stripeChargeId: args.stripeChargeId,
      stripeRefundId: args.stripeRefundId,
      status: args.status,
      errorMessage: args.errorMessage,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Internal mutation to update transaction status.
 *
 * @param transactionId - The transaction ID
 * @param status - New status
 * @param errorMessage - Optional error message
 * @internal
 */
export const updateTransactionStatus = internalMutation({
  args: {
    transactionId: v.id("transactions"),
    status: transactionStatusValidator,
    stripeChargeId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.stripeChargeId) {
      updates.stripeChargeId = args.stripeChargeId;
    }
    if (args.errorMessage) {
      updates.errorMessage = args.errorMessage;
    }

    await ctx.db.patch(args.transactionId, updates);
  },
});

/**
 * Internal query to get booking for payment.
 * Verifies the user is the fan who made the booking.
 *
 * @param bookingId - The booking ID
 * @param clerkId - The user's Clerk ID
 * @returns The booking if found and user is the fan
 * @internal
 */
export const getBookingForPayment = internalQuery({
  args: {
    bookingId: v.id("bookings"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      return null;
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      return null;
    }

    // Only the fan can pay
    if (booking.fanId !== user._id) {
      return null;
    }

    return booking;
  },
});

/**
 * Internal query to get band owner.
 *
 * @param bandId - The band ID
 * @returns The owner user if found
 * @internal
 */
export const getBandOwner = internalQuery({
  args: {
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    const band = await ctx.db.get(args.bandId);
    if (!band) {
      return null;
    }

    const owner = await ctx.db.get(band.userId);
    return owner;
  },
});

/**
 * Internal query to get successful transactions for a booking.
 *
 * @param bookingId - The booking ID
 * @returns Array of successful transactions
 * @internal
 */
export const getSuccessfulTransactions = internalQuery({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "succeeded"),
          q.neq(q.field("type"), "refund")
        )
      )
      .collect();
  },
});

/**
 * Internal mutation to update booking after refund.
 *
 * @param bookingId - The booking ID
 * @param refundedAmount - Amount refunded in cents
 * @internal
 */
export const updateBookingAfterRefund = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    refundedAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return;

    const newPaidAmount = Math.max(
      0,
      booking.paidAmountInCents - args.refundedAmount
    );

    await ctx.db.patch(args.bookingId, {
      paidAmountInCents: newPaidAmount,
    });
  },
});

/**
 * Internal query to get a transaction by Stripe PaymentIntent ID.
 *
 * @param stripePaymentIntentId - The Stripe PaymentIntent ID
 * @returns The transaction if found
 * @internal
 */
export const getByStripePaymentIntent = internalQuery({
  args: {
    stripePaymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_stripe_payment_intent", (q) =>
        q.eq("stripePaymentIntentId", args.stripePaymentIntentId)
      )
      .first();
  },
});

/**
 * Gets transaction history for a booking.
 *
 * @param bookingId - The booking ID
 * @returns Array of transactions
 */
export const getTransactionHistory = query({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      return [];
    }

    // Check if user is involved
    const band = await ctx.db.get(booking.bandId);
    const isFan = booking.fanId === user._id;
    const isBand = band && band.userId === user._id;

    if (!isFan && !isBand) {
      return [];
    }

    return await ctx.db
      .query("transactions")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .order("desc")
      .collect();
  },
});
