import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

// Clerk webhook handler for user sync
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.json();
    const eventType = payload.type;

    switch (eventType) {
      case "user.created":
      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url } =
          payload.data;

        const email = email_addresses?.[0]?.email_address;
        const name = [first_name, last_name].filter(Boolean).join(" ") || "User";

        if (email) {
          await ctx.runMutation(internal.users.createUserFromClerk, {
            clerkId: id,
            email,
            name,
            avatar: image_url,
          });
        }
        break;
      }

      case "user.deleted": {
        // Handle user deletion if needed
        // For now, we'll keep user data for integrity
        break;
      }
    }

    return new Response("OK", { status: 200 });
  }),
});

// Stripe webhook handler for payment events
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const stripeSignature = request.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    if (!stripeSignature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    const body = await request.text();

    // Verify webhook signature
    let event;
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-02-24.acacia",
      });
      event = stripe.webhooks.constructEvent(body, stripeSignature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata.bookingId as Id<"bookings">;
        const paymentType = paymentIntent.metadata.type;

        if (!bookingId) {
          console.error("No bookingId in payment metadata");
          break;
        }

        // Get the transaction
        const transaction = await ctx.runQuery(
          internal.payments.getByStripePaymentIntent,
          { stripePaymentIntentId: paymentIntent.id }
        );

        if (transaction) {
          // Update transaction status
          await ctx.runMutation(internal.payments.updateTransactionStatus, {
            transactionId: transaction._id,
            status: "succeeded",
            stripeChargeId: paymentIntent.latest_charge as string | undefined,
          });
        }

        // Get current booking to calculate new paid amount
        const booking = await ctx.runQuery(internal.payments.getBookingForPayment, {
          bookingId,
          clerkId: paymentIntent.metadata.fanId,
        });

        if (booking) {
          const now = Date.now();
          const newPaidAmount = booking.paidAmountInCents + paymentIntent.amount;

          if (paymentType === "deposit") {
            // Update booking to deposit_paid
            await ctx.runMutation(internal.bookings.updatePaymentStatus, {
              bookingId,
              status: "deposit_paid",
              paidAmount: newPaidAmount,
              depositPaidAt: now,
            });

            // Notify band
            const band = await ctx.runQuery(internal.payments.getBandOwner, {
              bandId: booking.bandId,
            });
            if (band) {
              await ctx.runMutation(internal.notifications.createNotification, {
                userId: band._id,
                type: "deposit_received",
                title: "Deposit Received",
                content: `Deposit of $${(paymentIntent.amount / 100).toFixed(2)} received for ${booking.eventName}`,
                bandId: booking.bandId,
              });
            }
          } else if (paymentType === "final_payment") {
            // Update booking to confirmed
            await ctx.runMutation(internal.bookings.updatePaymentStatus, {
              bookingId,
              status: "confirmed",
              paidAmount: newPaidAmount,
              finalPaymentAt: now,
              confirmedAt: now,
            });

            // Notify band
            const band = await ctx.runQuery(internal.payments.getBandOwner, {
              bandId: booking.bandId,
            });
            if (band) {
              await ctx.runMutation(internal.notifications.createNotification, {
                userId: band._id,
                type: "payment_received",
                title: "Full Payment Received",
                content: `Booking for ${booking.eventName} is now confirmed!`,
                bandId: booking.bandId,
              });
            }
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;

        // Get the transaction
        const transaction = await ctx.runQuery(
          internal.payments.getByStripePaymentIntent,
          { stripePaymentIntentId: paymentIntent.id }
        );

        if (transaction) {
          const errorMessage =
            paymentIntent.last_payment_error?.message ?? "Payment failed";

          await ctx.runMutation(internal.payments.updateTransactionStatus, {
            transactionId: transaction._id,
            status: "failed",
            errorMessage,
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const paymentIntentId = charge.payment_intent as string | null;

        if (paymentIntentId) {
          const transaction = await ctx.runQuery(
            internal.payments.getByStripePaymentIntent,
            { stripePaymentIntentId: paymentIntentId }
          );

          if (transaction) {
            await ctx.runMutation(internal.payments.updateTransactionStatus, {
              transactionId: transaction._id,
              status: "refunded",
            });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
