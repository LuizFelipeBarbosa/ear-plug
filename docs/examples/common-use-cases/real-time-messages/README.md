# Real-Time Messages Example

This directory contains a complete real-time messaging implementation for band-venue communication in the Ear-Plug application.

## Files

- `ConversationList.tsx` - List of conversations with unread badges
- `MessageThread.tsx` - Individual conversation view with message sending

## Features

### ConversationList

- Real-time unread count updates
- Last message preview
- Relative timestamps (e.g., "2h ago")
- Venue avatars
- Selection state for split-pane layouts
- Empty state for new users

### MessageThread

- Real-time message updates via Convex subscriptions
- Auto-scroll to newest messages
- Message grouping by sender
- Optimistic message sending
- Read receipt marking on open
- Keyboard shortcuts (Enter to send)
- Loading and empty states

## Usage

### Basic Conversation List

```tsx
import { ConversationList } from "@/components/messages/ConversationList";

export default function MessagesPage() {
  return <ConversationList />;
}
```

### Split-Pane Layout (Desktop)

```tsx
import { MessagingLayout, ConversationList } from "@/components/messages/ConversationList";
import { MessageThread } from "@/components/messages/MessageThread";

export default function MessagesPage() {
  const [selectedId, setSelectedId] = useState<Id<"conversations">>();

  return (
    <MessagingLayout>
      {selectedId ? (
        <MessageThread conversationId={selectedId} />
      ) : (
        <EmptyState />
      )}
    </MessagingLayout>
  );
}
```

### Individual Conversation Page

```tsx
import { MessageThread } from "@/components/messages/MessageThread";

export default function ConversationPage({
  params
}: {
  params: { id: string }
}) {
  return (
    <MessageThread
      conversationId={params.id as Id<"conversations">}
      venueName="The Fillmore"
    />
  );
}
```

## Real-Time Updates

The messaging components leverage Convex's real-time capabilities:

```tsx
// In useConversation hook
const messages = useQuery(
  api.messages.getConversationMessages,
  conversationId ? { conversationId } : "skip"
);

// Messages automatically update when:
// - A new message is sent by either party
// - A message is read
// - The conversation is modified
```

## Data Flow

```
ConversationList                    MessageThread
      |                                   |
      v                                   v
useBandConversations()            useConversation(id)
      |                                   |
      v                                   v
+------------------+              +------------------+
| getBandConversations |          | getConversationMessages |
| getUnreadCount        |          | send                    |
+------------------+              | markAsRead              |
      |                           +------------------+
      v                                   |
   Convex <---------- Real-time sync ------+
```

## Message Sending Flow

1. User types message and presses Enter
2. Input is cleared optimistically
3. `sendMessage(content)` mutation is called
4. On success: message appears via real-time subscription
5. On error: input is restored with the unsent message

```tsx
const handleSend = async () => {
  const content = newMessage.trim();
  if (!content) return;

  setNewMessage(""); // Optimistic clear

  try {
    await sendMessage(content);
  } catch (error) {
    setNewMessage(content); // Restore on error
  }
};
```

## Hooks Used

### useBandConversations

```tsx
const {
  conversations,      // ConversationWithDetails[]
  unreadCount,        // Total unread messages
  isLoading,
  startConversation,  // Mutation to create new conversation
} = useBandConversations();
```

### useConversation

```tsx
const {
  messages,    // MessageWithSender[]
  isLoading,
  sendMessage, // (content: string) => Promise
  markAsRead,  // () => Promise
} = useConversation(conversationId);
```

## Message Grouping

Messages from the same sender are grouped together visually:

```tsx
function groupMessages(messages: Message[]): Message[][] {
  // Groups consecutive messages from same sender
  // Returns array of message groups
}
```

This creates a chat-like appearance where:
- Sender name appears once per group
- Timestamp appears after the last message in a group
- Bubble corners vary based on position in group

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Send message |
| Shift+Enter | New line in message |

## Styling

The components follow the Ear-Plug design system:

- **Own messages**: Electric Lime background
- **Received messages**: Night Tertiary background
- **Unread badge**: Lime pill with night text
- **Input**: Brutalist style with lime focus border

## Mobile Considerations

- Conversation list is full-width on mobile
- Back button appears in message thread header
- Thread takes full screen on mobile
- Auto-scroll ensures latest messages are visible
- Touch-friendly input sizing (min 48px height)

## Accessibility

- Keyboard navigation between conversations
- ARIA labels on interactive elements
- Focus management when sending messages
- Color contrast meets WCAG guidelines

## Performance Notes

- Messages are loaded in a single query per conversation
- Convex handles real-time sync efficiently
- Auto-scroll uses `scrollIntoView` for smooth animation
- Message list uses keyed rendering for React optimization

## Error Handling

```tsx
try {
  await sendMessage(content);
} catch (error) {
  // Common errors:
  // - "Not authenticated" - session expired
  // - "User not found" - sync issue
  // - Network error - connection lost

  setNewMessage(content); // Restore message
  // Show error toast or inline message
}
```

## Extending

### Adding File Attachments

1. Add file input to MessageThread
2. Upload file to storage
3. Include attachment URL in message
4. Render attachment in MessageBubble

### Adding Typing Indicators

1. Create a mutation to update typing status
2. Subscribe to typing status query
3. Show indicator below message input
4. Debounce typing updates to reduce writes

### Message Reactions

1. Add reactions field to message schema
2. Create mutation to toggle reaction
3. Render reactions below message bubble
4. Show reaction picker on long press/hover
