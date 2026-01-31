import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

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

export default http;
