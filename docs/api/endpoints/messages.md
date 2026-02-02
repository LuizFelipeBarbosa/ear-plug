# Messages API

This document details all messaging-related queries and mutations in the Ear-Plug backend.

**Module:** `/convex/messages.ts`

---

## Table of Contents

1. [Overview](#overview)
2. [Queries](#queries)
   - [getBandConversations](#getbandconversations)
   - [getConversationMessages](#getconversationmessages)
   - [getUnreadCount](#getunreadcount)
3. [Mutations](#mutations)
   - [send](#send)
   - [markAsRead](#markasread)
   - [startConversation](#startconversation)
4. [Type Definitions](#type-definitions)

---

## Overview

The messaging system enables communication between bands and venues. Key concepts:

- **Conversation:** A thread between a specific band and venue
- **Messages:** Individual messages within a conversation
- **Unread tracking:** Messages have a `read` status for notification badges

Messages are typically initiated when a band wants to book a venue or follow up on an application.

---

## Queries

### getBandConversations

Get all conversations for the current user's band.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns `[]` if not musician or no band) |
| **Arguments** | None |
| **Returns** | `ConversationWithDetails[]` |

#### Access Requirements

- User must be authenticated
- User must have role `"musician"`
- User must have created a band

#### Response Schema

```typescript
{
  // Conversation fields
  _id: Id<"conversations">;
  bandId: Id<"bands">;
  venueId: Id<"venues">;
  lastMessageAt: number;
  lastMessagePreview?: string;

  // Enriched data
  venue: Venue | null;
  unreadCount: number;  // Messages not sent by current user and not read
}
```

#### Behavior

- Returns conversations sorted by `lastMessageAt` descending (most recent first)
- Calculates unread count for each conversation
- Only counts messages as unread if they were sent by someone other than the current user

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function MessagesInbox() {
  const conversations = useQuery(api.messages.getBandConversations);

  if (conversations === undefined) return <LoadingSpinner />;

  if (conversations.length === 0) {
    return <EmptyState message="No conversations yet" />;
  }

  return (
    <div>
      {conversations.map((conv) => (
        <ConversationPreview
          key={conv._id}
          conversation={conv}
          venue={conv.venue}
          unreadCount={conv.unreadCount}
        />
      ))}
    </div>
  );
}
```

#### Hook Wrapper

```typescript
import { useBandConversations } from "@/hooks";

function Component() {
  const { conversations, unreadCount, isLoading, startConversation } = useBandConversations();
}
```

---

### getConversationMessages

Get all messages in a conversation.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns `[]` if unauthenticated) |
| **Arguments** | `{ conversationId: Id<"conversations"> }` |
| **Returns** | `MessageWithSender[]` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `conversationId` | `Id<"conversations">` | Yes | The conversation to get messages from |

#### Response Schema

```typescript
{
  // Message fields
  _id: Id<"messages">;
  conversationId: Id<"conversations">;
  senderId: Id<"users">;
  content: string;
  timestamp: number;
  read: boolean;

  // Enriched data
  sender: User | null;
}
```

#### Behavior

- Returns messages sorted by timestamp ascending (oldest first)
- Includes sender user data for each message

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function ConversationView({ conversationId }) {
  const messages = useQuery(api.messages.getConversationMessages, {
    conversationId,
  });

  return (
    <div className="message-list">
      {messages?.map((msg) => (
        <MessageBubble
          key={msg._id}
          content={msg.content}
          sender={msg.sender}
          timestamp={msg.timestamp}
          isOwnMessage={msg.senderId === currentUserId}
        />
      ))}
    </div>
  );
}
```

#### Hook Wrapper

```typescript
import { useConversation } from "@/hooks";

function Component({ conversationId }) {
  const { messages, isLoading, sendMessage, markAsRead } = useConversation(conversationId);
}
```

---

### getUnreadCount

Get total unread message count for the current user's band.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns `0` if not musician) |
| **Arguments** | None |
| **Returns** | `number` |

#### Access Requirements

- User must be authenticated
- User must have role `"musician"`
- User must have created a band

#### Behavior

- Sums unread messages across all conversations
- Only counts messages not sent by the current user

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function MessagesNavItem() {
  const unreadCount = useQuery(api.messages.getUnreadCount);

  return (
    <NavItem href="/messages">
      Messages
      {unreadCount > 0 && (
        <Badge>{unreadCount}</Badge>
      )}
    </NavItem>
  );
}
```

---

## Mutations

### send

Send a message in a conversation.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ conversationId: Id<"conversations">, content: string }` |
| **Returns** | `Id<"messages">` |
| **Throws** | `"Not authenticated"`, `"User not found"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `conversationId` | `Id<"conversations">` | Yes | The conversation to send to |
| `content` | `string` | Yes | Message content |

#### Side Effects

- Creates a new message with `read: false`
- Updates conversation's `lastMessageAt` timestamp
- Updates conversation's `lastMessagePreview` (truncated to 50 chars)

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function MessageInput({ conversationId }) {
  const sendMessage = useMutation(api.messages.send);
  const [content, setContent] = useState("");

  const handleSend = async () => {
    if (!content.trim()) return;

    await sendMessage({
      conversationId,
      content: content.trim(),
    });
    setContent("");
  };

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type a message..."
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

---

### markAsRead

Mark all messages in a conversation as read.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ conversationId: Id<"conversations"> }` |
| **Returns** | `{ markedCount: number }` |
| **Throws** | `"Not authenticated"`, `"User not found"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `conversationId` | `Id<"conversations">` | Yes | The conversation to mark as read |

#### Behavior

- Only marks messages not sent by the current user
- Only marks messages with `read: false`
- Returns count of messages that were marked

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect } from "react";

function ConversationView({ conversationId }) {
  const markAsRead = useMutation(api.messages.markAsRead);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    markAsRead({ conversationId });
  }, [conversationId, markAsRead]);

  return (
    <div>
      {/* Message list */}
    </div>
  );
}
```

---

### startConversation

Start a new conversation between a band and venue, or get an existing one.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ bandId: Id<"bands">, venueId: Id<"venues">, initialMessage?: string }` |
| **Returns** | `Id<"conversations">` |
| **Throws** | `"Not authenticated"`, `"User not found"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `bandId` | `Id<"bands">` | Yes | The band starting the conversation |
| `venueId` | `Id<"venues">` | Yes | The venue to message |
| `initialMessage` | `string` | No | Optional first message to send |

#### Behavior

1. Checks if conversation already exists between band and venue
2. If exists:
   - Sends initial message if provided
   - Returns existing conversation ID
3. If not exists:
   - Creates new conversation
   - Sends initial message if provided
   - Returns new conversation ID

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function ContactVenueButton({ bandId, venueId }) {
  const startConversation = useMutation(api.messages.startConversation);

  const handleContact = async () => {
    const conversationId = await startConversation({
      bandId,
      venueId,
      initialMessage: "Hi! We're interested in booking a show at your venue.",
    });

    // Navigate to conversation
    router.push(`/messages/${conversationId}`);
  };

  return <button onClick={handleContact}>Contact Venue</button>;
}
```

#### With Venue Application

```typescript
function ApplyAndMessage({ bandId, venueId, openDateId }) {
  const applyToOpenDate = useMutation(api.venues.applyToOpenDate);
  const startConversation = useMutation(api.messages.startConversation);

  const handleApply = async () => {
    // Apply to the open date
    await applyToOpenDate({
      bandId,
      openDateId,
      message: "We'd love to play this date!",
    });

    // Start a conversation for follow-up
    const conversationId = await startConversation({
      bandId,
      venueId,
      initialMessage: "Hi! We just applied for your open date. Looking forward to hearing from you!",
    });
  };

  return <button onClick={handleApply}>Apply and Send Message</button>;
}
```

---

## Type Definitions

### Conversation

```typescript
interface Conversation {
  _id: Id<"conversations">;
  _creationTime: number;
  bandId: Id<"bands">;
  venueId: Id<"venues">;
  lastMessageAt: number;
  lastMessagePreview?: string;
}
```

### ConversationWithDetails

```typescript
interface ConversationWithDetails extends Conversation {
  venue: Venue | null;
  unreadCount: number;
}
```

### Message

```typescript
interface Message {
  _id: Id<"messages">;
  _creationTime: number;
  conversationId: Id<"conversations">;
  senderId: Id<"users">;
  content: string;
  timestamp: number;
  read: boolean;
}
```

### MessageWithSender

```typescript
interface MessageWithSender extends Message {
  sender: User | null;
}
```

---

## Database Schema

### Table: `conversations`

| Field | Type | Description |
|-------|------|-------------|
| `bandId` | `Id<"bands">` | The band in the conversation |
| `venueId` | `Id<"venues">` | The venue in the conversation |
| `lastMessageAt` | `number` | Timestamp of most recent message |
| `lastMessagePreview` | `string?` | Truncated preview of last message |

### Table: `messages`

| Field | Type | Description |
|-------|------|-------------|
| `conversationId` | `Id<"conversations">` | Parent conversation |
| `senderId` | `Id<"users">` | User who sent the message |
| `content` | `string` | Message content |
| `timestamp` | `number` | When message was sent |
| `read` | `boolean` | Whether recipient has read it |

### Indexes

**conversations:**
| Index | Fields | Purpose |
|-------|--------|---------|
| `by_band` | `bandId` | Get band's conversations |
| `by_venue` | `venueId` | Get venue's conversations |
| `by_band_venue` | `bandId, venueId` | Find existing conversation |
| `by_last_message` | `lastMessageAt` | Sort by recent activity |

**messages:**
| Index | Fields | Purpose |
|-------|--------|---------|
| `by_conversation` | `conversationId` | Get conversation's messages |
| `by_sender` | `senderId` | Get user's sent messages |
| `by_timestamp` | `timestamp` | Sort by time |

---

## Messaging Flow

### Starting a Conversation

```
1. Band user clicks "Contact Venue" on venue profile
2. startConversation mutation called with bandId, venueId
3. If conversation exists, returns existing ID
4. If not, creates new conversation
5. If initialMessage provided, sends first message
6. User navigated to conversation view
```

### Reading Messages

```
1. User opens conversation (clicks on inbox item)
2. getConversationMessages query fetches all messages
3. markAsRead mutation called to clear unread status
4. Messages displayed with sender info
5. Real-time updates show new messages automatically
```

### Sending Messages

```
1. User types message in input
2. send mutation called with conversationId and content
3. Message created with read: false
4. Conversation lastMessageAt updated
5. Real-time: recipient sees new message and unread badge
```

---

## Related Documentation

- [Bands API](./bands.md) - Band management
- [Venues API](./venues.md) - Venue management and applications
- [Notifications API](./notifications.md) - Message notifications
