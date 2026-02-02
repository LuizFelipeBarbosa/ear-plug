# Webhooks

This document details the HTTP webhook endpoints in the Ear-Plug backend.

**Module:** `/convex/http.ts`

---

## Table of Contents

1. [Overview](#overview)
2. [Clerk Webhook](#clerk-webhook)
3. [Payload Schemas](#payload-schemas)
4. [Configuration](#configuration)
5. [Security](#security)
6. [Error Handling](#error-handling)

---

## Overview

Ear-Plug uses HTTP webhooks to receive external events from third-party services. Currently, the only webhook endpoint handles Clerk user events for synchronizing user data between Clerk and Convex.

### Webhook Architecture

```
Clerk (Identity Provider)
        |
        | POST /clerk-webhook
        v
   Convex HTTP Router
        |
        | runMutation
        v
   users.createUserFromClerk
        |
        v
   Convex Database (users table)
```

---

## Clerk Webhook

### Endpoint

| Property | Value |
|----------|-------|
| **Method** | POST |
| **Path** | `/clerk-webhook` |
| **URL** | `https://<deployment>.convex.site/clerk-webhook` |
| **Authentication** | Clerk webhook signature (TODO: implement verification) |

### Supported Events

| Event Type | Description | Action Taken |
|------------|-------------|--------------|
| `user.created` | New user signed up in Clerk | Creates user in Convex |
| `user.updated` | User profile updated in Clerk | Creates/updates user in Convex |
| `user.deleted` | User deleted from Clerk | No action (data preserved) |

### Handler Implementation

```typescript
// /convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

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
```

---

## Payload Schemas

### user.created / user.updated

```typescript
interface ClerkUserWebhookPayload {
  type: "user.created" | "user.updated";
  data: {
    id: string;                    // Clerk user ID
    email_addresses: {
      email_address: string;
      id: string;
      verification: {
        status: string;
        strategy: string;
      };
    }[];
    first_name: string | null;
    last_name: string | null;
    image_url: string;
    profile_image_url: string;
    created_at: number;
    updated_at: number;
    // Additional fields available but not used:
    // username, phone_numbers, external_accounts, etc.
  };
  object: "event";
  timestamp: number;
}
```

### user.deleted

```typescript
interface ClerkUserDeletedPayload {
  type: "user.deleted";
  data: {
    id: string;                    // Clerk user ID
    deleted: true;
  };
  object: "event";
  timestamp: number;
}
```

### Full Payload Example

```json
{
  "type": "user.created",
  "data": {
    "id": "user_2NNEqL2nrIRdJ194ndJqAHwEfxC",
    "email_addresses": [
      {
        "email_address": "john@example.com",
        "id": "idn_2NNEqJJDaKjhgTFYLKs9gzDHdaR",
        "verification": {
          "status": "verified",
          "strategy": "email_code"
        }
      }
    ],
    "first_name": "John",
    "last_name": "Doe",
    "image_url": "https://img.clerk.com/...",
    "profile_image_url": "https://img.clerk.com/...",
    "created_at": 1654012591514,
    "updated_at": 1654012591514
  },
  "object": "event",
  "timestamp": 1654012591514
}
```

---

## Configuration

### Clerk Dashboard Setup

1. Navigate to your Clerk Dashboard
2. Go to **Webhooks** section
3. Click **Add Endpoint**
4. Configure the endpoint:

| Field | Value |
|-------|-------|
| **Endpoint URL** | `https://<your-deployment>.convex.site/clerk-webhook` |
| **Events to send** | `user.created`, `user.updated`, `user.deleted` |

### Getting Your Convex URL

```bash
# From your project root
npx convex deployment list

# Or check your .env.local file
# NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

The webhook URL uses `.convex.site` (not `.convex.cloud`):
- API calls: `https://your-deployment.convex.cloud`
- HTTP endpoints: `https://your-deployment.convex.site`

### Environment Variables

For webhook signature verification (recommended for production):

```env
# Add to Convex dashboard environment variables
CLERK_WEBHOOK_SECRET=whsec_...
```

---

## Security

### Current Implementation

The current implementation does not verify webhook signatures. This is acceptable for development but should be enhanced for production.

### Recommended: Signature Verification

Clerk signs webhook payloads using SVIX. To verify signatures:

1. Install the SVIX library in your Convex functions (if supported)
2. Get the webhook signing secret from Clerk Dashboard
3. Verify the signature before processing

```typescript
// Example signature verification (conceptual)
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.text();
    const headers = {
      "svix-id": request.headers.get("svix-id"),
      "svix-timestamp": request.headers.get("svix-timestamp"),
      "svix-signature": request.headers.get("svix-signature"),
    };

    // Verify signature
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    // ... verification logic ...

    const data = JSON.parse(payload);
    // Process webhook...
  }),
});
```

### Headers Sent by Clerk

| Header | Description |
|--------|-------------|
| `svix-id` | Unique message ID |
| `svix-timestamp` | Unix timestamp of the attempt |
| `svix-signature` | Signature for verification |
| `content-type` | `application/json` |

---

## Error Handling

### Response Codes

| Code | Meaning | Clerk Behavior |
|------|---------|----------------|
| `200` | Success | Marks delivery as successful |
| `4xx` | Client error | May retry depending on error |
| `5xx` | Server error | Will retry with backoff |

### Retry Policy

Clerk retries failed webhook deliveries with exponential backoff:

- First retry: ~1 minute
- Subsequent retries: increasing intervals
- Maximum retries: ~24 hours of attempts

### Handling Errors

```typescript
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json();

      // Validate required fields
      if (!payload.type || !payload.data) {
        return new Response("Invalid payload", { status: 400 });
      }

      // Process event...
      switch (payload.type) {
        case "user.created":
        case "user.updated":
          // ... handle event
          break;
        default:
          // Unknown event type - still return 200 to prevent retries
          console.log("Unknown event type:", payload.type);
      }

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Webhook error:", error);
      // Return 500 to trigger retry
      return new Response("Internal error", { status: 500 });
    }
  }),
});
```

---

## Internal Mutation

The webhook handler calls an internal mutation to create/update users:

### users.createUserFromClerk

```typescript
// /convex/users.ts
export const createUserFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      // User already exists - webhook is for update
      // Currently we don't update existing users from webhook
      // to preserve user-set data (role, preferences, etc.)
      return existingUser._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      avatar: args.avatar,
      role: "fan",            // Default role
      memberSince: Date.now(),
      showsAttended: 0,
    });
  },
});
```

### Why Internal Mutation?

- Cannot be called directly from client code
- Only accessible within Convex functions
- Provides security for sensitive operations
- Allows webhook to create users without authentication

---

## Data Flow

### User Created in Clerk

```
1. User signs up via Clerk UI
2. Clerk creates user record
3. Clerk sends POST to /clerk-webhook with user.created event
4. Webhook handler extracts user data
5. createUserFromClerk mutation called
6. New user record created in Convex with:
   - clerkId: Clerk user ID
   - email: Primary email
   - name: Full name
   - avatar: Profile image URL
   - role: "fan" (default)
   - memberSince: Current timestamp
   - showsAttended: 0
```

### User Updated in Clerk

```
1. User updates profile in Clerk
2. Clerk sends POST to /clerk-webhook with user.updated event
3. Webhook handler extracts user data
4. createUserFromClerk mutation called
5. If user exists: Returns existing ID (no update)
6. If user doesn't exist: Creates new user
```

### User Deleted in Clerk

```
1. User deleted from Clerk
2. Clerk sends POST to /clerk-webhook with user.deleted event
3. Webhook handler receives event
4. Currently: No action taken
5. User data preserved in Convex for data integrity
```

---

## Testing Webhooks

### Local Development

For local testing, use Clerk's webhook testing feature or a tunnel service:

1. **Clerk Dashboard:** Use the "Send test webhook" feature
2. **ngrok:** Expose your local Convex dev server

```bash
# If using ngrok (example)
ngrok http 3001  # Your Convex dev port

# Then update webhook URL in Clerk to ngrok URL
```

### Verifying Webhook Delivery

1. Check Clerk Dashboard webhook logs
2. Check Convex dashboard function logs
3. Query users table to verify user was created

```typescript
// In Convex dashboard or using npx convex run
const user = await ctx.db
  .query("users")
  .withIndex("by_clerk_id", (q) => q.eq("clerkId", "user_..."))
  .unique();
console.log(user);
```

---

## Related Documentation

- [Authentication](./authentication.md) - Clerk auth flow
- [Users API](./endpoints/users.md) - User management endpoints
- [Clerk Webhooks Documentation](https://clerk.com/docs/integrations/webhooks)
