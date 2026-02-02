# Tutorial: Adding a New Feature

This step-by-step guide walks through adding a complete feature to Ear-Plug. We will add a "Share Event" feature as an example.

---

## Overview

Adding a feature typically involves:

1. Define types (if needed)
2. Create/update Convex functions
3. Create/update React hooks
4. Build UI components
5. Test the feature

---

## Step 1: Plan the Feature

Before coding, define:

- **What does the feature do?** Share event to social media or copy link
- **Who uses it?** Both fans and musicians
- **What data is needed?** Event ID, share URL generation
- **What UI is needed?** Share button on event cards and detail pages

---

## Step 2: Define Types (if needed)

If your feature introduces new data structures, add types to the shared package.

**File:** `packages/shared/src/types/index.ts`

```typescript
// Example: If we needed a ShareTarget type
export type ShareTarget = "twitter" | "facebook" | "copy";

export interface ShareOptions {
  target: ShareTarget;
  eventId: string;
  customMessage?: string;
}
```

For this share feature, we do not need new database types since we are just reading existing event data.

---

## Step 3: Create Convex Functions (if needed)

If the feature requires backend logic, add queries or mutations.

**File:** `convex/events.ts`

For sharing, we might want to track share counts:

```typescript
// Add to convex/events.ts

export const getShareableEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    const band = await ctx.db.get(event.bandId);
    const venue = await ctx.db.get(event.venueId);

    // Return minimal data for sharing
    return {
      title: event.title,
      bandName: band?.name ?? "Unknown Band",
      venueName: venue?.name ?? "Unknown Venue",
      venueCity: venue?.city ?? "",
      dateTime: event.dateTime,
      price: event.price,
    };
  },
});

// Optional: Track shares
export const trackShare = mutation({
  args: {
    eventId: v.id("events"),
    platform: v.string()
  },
  handler: async (ctx, args) => {
    // Could log to analytics table or increment counter
    console.log(`Event ${args.eventId} shared on ${args.platform}`);
  },
});
```

Run `npx convex dev` to generate types after adding functions.

---

## Step 4: Create a React Hook

Wrap the Convex functions in a custom hook for easy consumption.

**File:** `apps/web/src/hooks/useEventShare.ts`

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useEventShare(eventId: Id<"events"> | undefined) {
  const shareData = useQuery(
    api.events.getShareableEvent,
    eventId ? { eventId } : "skip"
  );
  const trackShare = useMutation(api.events.trackShare);

  const generateShareUrl = () => {
    if (typeof window === "undefined" || !eventId) return "";
    return `${window.location.origin}/gig/${eventId}`;
  };

  const generateShareText = () => {
    if (!shareData) return "";
    const date = new Date(shareData.dateTime).toLocaleDateString();
    return `Check out ${shareData.bandName} at ${shareData.venueName} on ${date}!`;
  };

  const shareToTwitter = async () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      generateShareText()
    )}&url=${encodeURIComponent(generateShareUrl())}`;
    window.open(url, "_blank");
    if (eventId) {
      await trackShare({ eventId, platform: "twitter" });
    }
  };

  const copyToClipboard = async () => {
    const text = `${generateShareText()} ${generateShareUrl()}`;
    await navigator.clipboard.writeText(text);
    if (eventId) {
      await trackShare({ eventId, platform: "copy" });
    }
    return true;
  };

  return {
    shareData,
    isLoading: shareData === undefined,
    shareUrl: generateShareUrl(),
    shareText: generateShareText(),
    shareToTwitter,
    copyToClipboard,
  };
}
```

---

## Step 5: Build UI Components

Create a reusable share button component.

**File:** `apps/web/src/components/events/ShareButton.tsx`

```typescript
"use client";

import { useState } from "react";
import { Share2, Twitter, Copy, Check } from "lucide-react";
import { useEventShare } from "@/hooks/useEventShare";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface ShareButtonProps {
  eventId: Id<"events">;
  className?: string;
}

export function ShareButton({ eventId, className }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { shareToTwitter, copyToClipboard, isLoading } = useEventShare(eventId);

  const handleCopy = async () => {
    await copyToClipboard();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return null;

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full bg-night-secondary hover:bg-night-tertiary transition-colors"
        aria-label="Share event"
      >
        <Share2 className="w-5 h-5 text-zinc-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-night-tertiary border border-zinc-800 rounded-lg p-2 z-10 min-w-[140px]">
          <button
            onClick={shareToTwitter}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-night-secondary rounded"
          >
            <Twitter className="w-4 h-4" />
            Twitter
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-night-secondary rounded"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-lime" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Link
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Step 6: Integrate into Existing Components

Add the share button to event cards and detail pages.

**File:** `apps/web/src/components/events/EventCard.tsx` (partial update)

```typescript
// Add import at top
import { ShareButton } from "./ShareButton";

// Inside the component, add the button near other action buttons
<div className="flex items-center gap-2">
  <ShareButton eventId={event._id} />
  {/* existing like/RSVP buttons */}
</div>
```

---

## Step 7: Test the Feature

### Manual Testing

1. Start the dev server: `pnpm dev:web`
2. Navigate to an event card
3. Click the share button
4. Verify Twitter share opens in new window
5. Verify copy link works and shows confirmation

### Type Checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint
```

---

## Common Patterns Used

### Conditional Queries

Use `"skip"` when the query should not run:

```typescript
const data = useQuery(
  api.events.getById,
  eventId ? { eventId } : "skip"
);
```

### Loading States

Always handle undefined (loading) state:

```typescript
if (isLoading) {
  return <LoadingSpinner />;
}
```

### Click Event Handling

Prevent event bubbling when buttons are inside clickable cards:

```typescript
const handleClick = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  // action
};
```

### Error Handling

Wrap async operations in try/catch:

```typescript
const handleAction = async () => {
  try {
    await someAsyncOperation();
  } catch (err) {
    console.error("Action failed:", err);
    // Show user-friendly error
  }
};
```

---

## Checklist

Before considering your feature complete:

- [ ] Types defined in `packages/shared` (if needed)
- [ ] Convex functions created with proper validation
- [ ] Custom hook wrapping Convex calls
- [ ] UI components following existing patterns
- [ ] Loading states handled
- [ ] Error states handled
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Tested manually in browser
- [ ] Works for both fan and musician roles (if applicable)

---

## Next Steps

- Add the feature to mobile app using the same patterns
- See [Creating Convex Functions](./creating-convex-functions.md) for backend details
- See [Working with Auth](./working-with-auth.md) for auth-protected features
