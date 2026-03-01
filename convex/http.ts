import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

// Clerk webhook handler for user sync
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Verify webhook signature using Svix
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("CLERK_WEBHOOK_SECRET is not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await request.text();
    const wh = new Webhook(webhookSecret);
    let payload: { type: string; data: Record<string, unknown> };
    try {
      payload = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as typeof payload;
    } catch {
      return new Response("Invalid webhook signature", { status: 401 });
    }

    const eventType = payload.type;

    switch (eventType) {
      case "user.created":
      case "user.updated": {
        const {
          id,
          email_addresses,
          first_name,
          last_name,
          image_url,
          primary_phone_number_id,
          phone_numbers,
        } = payload.data as {
          id: string;
          email_addresses?: { email_address: string }[];
          first_name?: string;
          last_name?: string;
          image_url?: string;
          primary_phone_number_id?: string;
          phone_numbers?: { id?: string; phone_number?: string }[];
        };

        const email = email_addresses?.[0]?.email_address;
        const primaryPhone = Array.isArray(phone_numbers)
          ? (
              phone_numbers.find(
                (entry) => entry.id === primary_phone_number_id
              ) ?? phone_numbers[0]
            )?.phone_number
          : undefined;
        const name = [first_name, last_name].filter(Boolean).join(" ") || "User";

        await ctx.runMutation(internal.users.createUserFromClerk, {
          clerkId: id,
          email: email ?? "",
          phoneNumber: primaryPhone,
          name,
          avatar: image_url,
        });
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

export default http;
