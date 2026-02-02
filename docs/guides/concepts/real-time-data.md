# Real-Time Data with Convex

Ear-Plug uses Convex for its backend, which provides automatic real-time data synchronization. This document explains how real-time data works and how to use it effectively.

---

## How Real-Time Works

### The Convex Model

Unlike traditional REST APIs or even GraphQL subscriptions, Convex queries are automatically reactive:

```
Client Query -> Convex Server -> Database
                     |
                     v
            Subscription Created
                     |
                     v (data changes)
            Automatic Re-execution
                     |
                     v
            Client Update (automatic)
```

When you use `useQuery` from Convex:

1. The query runs on the server
2. Convex tracks which database rows were read
3. When any of those rows change, the query re-runs
4. The client automatically receives updated data

---

## Using Real-Time Queries

### Basic Query

```typescript
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function EventList() {
  const events = useQuery(api.events.listUpcoming);

  // `events` is:
  // - undefined: loading
  // - EventWithDetails[]: data loaded

  if (events === undefined) {
    return <Loading />;
  }

  return (
    <ul>
      {events.map(event => (
        <EventCard key={event._id} event={event} />
      ))}
    </ul>
  );
}
```

### Query with Parameters

```typescript
export function EventsByGenre({ genre }: { genre: Genre }) {
  const events = useQuery(api.events.listByGenre, { genre });

  // Query re-runs when genre changes
  // Data updates when matching events change
}
```

### Conditional Queries

Use `"skip"` to conditionally skip a query:

```typescript
export function EventDetail({ eventId }: { eventId?: string }) {
  // Skip query if no ID
  const event = useQuery(
    api.events.getById,
    eventId ? { eventId } : "skip"
  );

  if (event === undefined) {
    return <Loading />;
  }

  if (event === null) {
    return <NotFound />;
  }

  return <EventDetails event={event} />;
}
```

---

## Real-Time in Practice

### RSVP Count Updates

When a user RSVPs to an event:

1. Mutation runs, updates `rsvps` table and event's `rsvpCount`
2. Any component querying that event automatically updates
3. No manual refresh needed

```typescript
// Component showing RSVP count
export function EventCard({ eventId }: { eventId: Id<"events"> }) {
  const event = useQuery(api.events.getById, { eventId });

  // This automatically updates when anyone RSVPs
  return <span>{event?.rsvpCount} attending</span>;
}
```

### Chat Messages

Messages appear instantly without polling:

```typescript
export function ChatView({ conversationId }: { conversationId: Id<"conversations"> }) {
  // Messages update in real-time
  const messages = useQuery(api.messages.getConversationMessages, {
    conversationId
  });

  // New messages appear automatically
  return (
    <ScrollView>
      {messages?.map(msg => (
        <MessageBubble key={msg._id} message={msg} />
      ))}
    </ScrollView>
  );
}
```

### Notification Badge

Unread count updates instantly:

```typescript
export function NotificationBadge() {
  const unreadCount = useQuery(api.notifications.getUnreadCount);

  if (!unreadCount) return null;

  return (
    <View className="absolute -top-1 -right-1 bg-red-500 rounded-full">
      <Text>{unreadCount}</Text>
    </View>
  );
}
```

---

## Mutations and Optimistic Updates

### Basic Mutation

```typescript
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function RsvpButton({ eventId }: { eventId: Id<"events"> }) {
  const rsvp = useMutation(api.events.rsvp);

  const handleRsvp = async () => {
    // Mutation runs, data updates automatically
    const result = await rsvp({ eventId });
    console.log(result.action); // "added" or "removed"
  };

  return <button onClick={handleRsvp}>RSVP</button>;
}
```

### Manual Optimistic Updates

For instant UI feedback before the server responds:

```typescript
export function LikeButton({ eventId }: { eventId: Id<"events"> }) {
  const toggleLike = useMutation(api.events.toggleLike);
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);

  const status = useQuery(api.events.getUserEventStatus, { eventId });
  const actualLiked = status?.hasLiked ?? false;

  // Use optimistic value if set, otherwise actual
  const isLiked = optimisticLiked ?? actualLiked;

  const handleLike = async () => {
    // Optimistically update UI
    setOptimisticLiked(!isLiked);

    try {
      await toggleLike({ eventId });
    } finally {
      // Clear optimistic state, let real data take over
      setOptimisticLiked(null);
    }
  };

  return (
    <button onClick={handleLike}>
      <Heart filled={isLiked} />
    </button>
  );
}
```

---

## Query Patterns

### Multiple Related Queries

Combine multiple queries in a single component:

```typescript
export function Dashboard() {
  const user = useQuery(api.users.getCurrentUser);
  const band = useQuery(api.bands.getCurrentUserBand);
  const events = useQuery(api.events.listByBand,
    band ? { bandId: band._id } : "skip"
  );

  // All three update independently as data changes
  const isLoading = user === undefined || band === undefined;

  if (isLoading) return <Loading />;

  return (
    <div>
      <h1>{band?.name}</h1>
      <EventList events={events ?? []} />
    </div>
  );
}
```

### Paginated Queries

Handle large data sets with pagination:

```typescript
export function EventFeed() {
  const [limit, setLimit] = useState(20);
  const events = useQuery(api.events.listUpcoming, { limit });

  const loadMore = () => setLimit(prev => prev + 20);

  return (
    <div>
      {events?.map(event => <EventCard key={event._id} event={event} />)}
      <button onClick={loadMore}>Load More</button>
    </div>
  );
}
```

---

## Performance Considerations

### Query Efficiency

Convex tracks reads at the row level. Efficient queries:

```typescript
// Good: Uses index, returns specific data
export const getById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
  },
});

// Good: Uses index for filtering
export const listUpcoming = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("events")
      .withIndex("by_date")
      .filter(q => q.gte(q.field("dateTime"), Date.now()))
      .take(50);
  },
});
```

### Avoiding Unnecessary Re-renders

```typescript
// Extract stable references
const eventId = event._id;
const bandId = event.bandId;

// Good: Memoize expensive computations
const sortedEvents = useMemo(
  () => events?.sort((a, b) => a.dateTime - b.dateTime),
  [events]
);
```

### Query Batching

Convex automatically batches multiple queries. Call them freely:

```typescript
// These are batched efficiently
const user = useQuery(api.users.getCurrentUser);
const notifications = useQuery(api.notifications.getUnreadCount);
const messages = useQuery(api.messages.getUnreadCount);
```

---

## Handling Loading States

### Pattern 1: Simple Loading Check

```typescript
const data = useQuery(api.something.get);

if (data === undefined) {
  return <Loading />;
}
```

### Pattern 2: Combined Loading State

```typescript
export function useUserDashboard() {
  const user = useQuery(api.users.getCurrentUser);
  const band = useQuery(api.bands.getCurrentUserBand);
  const stats = useQuery(api.bands.getBandWithStats);

  return {
    user,
    band,
    stats,
    isLoading: user === undefined || band === undefined || stats === undefined,
  };
}
```

### Pattern 3: Skeleton Loading

```typescript
export function EventCard({ event }) {
  if (!event) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-zinc-800 rounded w-3/4" />
        <div className="h-3 bg-zinc-800 rounded w-1/2 mt-2" />
      </div>
    );
  }

  return <ActualEventCard event={event} />;
}
```

---

## Real-Time vs Polling

### Why Convex Real-Time is Better

| Aspect | Polling | Convex Real-Time |
|--------|---------|------------------|
| Latency | Interval dependent | Instant |
| Server Load | Constant | On-demand |
| Battery | Higher drain | Lower drain |
| Complexity | Manual setup | Automatic |
| Freshness | Up to interval stale | Always fresh |

### When Real-Time Activates

Data updates when:
- Another user modifies data your query reads
- You modify data via mutation
- A scheduled function modifies data

Data does NOT re-fetch when:
- Component re-renders
- Parent state changes
- Unrelated data changes

---

## Debugging Real-Time Issues

### Check Query Execution

In Convex Dashboard:
1. Go to Logs
2. Filter by function name
3. Watch query executions

### Verify Subscriptions

```typescript
// Add logging to see when data updates
const events = useQuery(api.events.listUpcoming);

useEffect(() => {
  console.log("Events updated:", events?.length);
}, [events]);
```

### Common Issues

1. **Query not updating**: Check if the query reads the changing data
2. **Too many updates**: Query might be reading too much data
3. **Stale data**: Ensure mutations are completing successfully

---

## Next Steps

- See [Creating Convex Functions](../tutorials/creating-convex-functions.md) for writing queries
- See [User Roles](./user-roles.md) for role-specific data
- See [Notifications](./notifications.md) for the notification system
