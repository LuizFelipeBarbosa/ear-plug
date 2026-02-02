# Event Listing Example

This directory contains a complete, production-ready event listing implementation for the Ear-Plug application.

## Files

- `EventList.tsx` - Main container component with filtering and state management
- `EventCard.tsx` - Reusable card component with RSVP/like functionality

## Features

- **Genre Filtering**: Filter events by music genre (indie, rock, jazz, etc.)
- **Loading States**: Skeleton loaders while data is fetching
- **Empty States**: Helpful messages when no events match the criteria
- **Real-time Updates**: Event data stays in sync with the Convex backend
- **Responsive Layout**: Grid layout on desktop, list on mobile
- **RSVP & Like**: Interactive buttons with optimistic updates

## Usage

### Basic Event List

```tsx
import { EventList } from "@/components/events/EventList";

export default function EventsPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Upcoming Events</h1>
      <EventList />
    </div>
  );
}
```

### Pre-filtered by Genre

```tsx
<EventList initialGenre="rock" limit={10} />
```

### Compact List without Filters

```tsx
<EventList showFilters={false} cardVariant="compact" limit={5} />
```

### Individual Event Card

```tsx
import { EventCard } from "@/components/events/EventCard";

function MyComponent({ event }) {
  return <EventCard event={event} variant="default" />;
}
```

## Props

### EventList Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialGenre` | `Genre` | `undefined` | Pre-selected genre filter |
| `limit` | `number` | `20` | Maximum events to display |
| `showFilters` | `boolean` | `true` | Show genre filter chips |
| `cardVariant` | `"default" \| "compact"` | `"default"` | Card style variant |
| `className` | `string` | `undefined` | Additional CSS classes |

### EventCard Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `event` | `EventCardData` | (required) | Event data to display |
| `variant` | `"default" \| "compact"` | `"default"` | Card style variant |
| `showLikeButton` | `boolean` | `true` | Show the like button |
| `showRsvpButton` | `boolean` | varies | Show RSVP button (default true for compact) |

## Data Flow

```
EventList
  |
  ├── useEvents(options) ──> Convex Query
  |     |
  |     └── Returns EventWithDetails[]
  |
  └── EventCard
        |
        ├── useQuery(getUserEventStatus) ──> User's RSVP/Like status
        |
        ├── useMutation(toggleLike) ──> Like/Unlike event
        |
        └── useMutation(rsvp) ──> RSVP/Cancel RSVP
```

## Styling

The components use the Ear-Plug design system:

- **Colors**: Night background, Electric Lime accents, Zinc neutrals
- **Typography**: Font weights and sizes follow the brutalist design
- **Borders**: Sharp corners on compact, rounded on default
- **Transitions**: 200ms duration for hover/active states

## Customization

### Adding a New Filter

To add a new filter (e.g., date range), modify the EventList component:

```tsx
const [dateRange, setDateRange] = useState<DateRange>();

const { events, isLoading } = useEvents({
  genre: selectedGenre,
  dateRange, // Add to the hook
  limit,
});
```

### Custom Empty State

Pass a custom empty component:

```tsx
<EventList
  emptyComponent={<MyCustomEmptyState />}
/>
```

### Different Card Layout

Create a new variant in EventCard or use composition:

```tsx
function EventTile({ event }) {
  return (
    <EventCard event={event}>
      {/* Custom layout */}
    </EventCard>
  );
}
```

## Performance Notes

- Events are fetched in a single query with band/venue data joined
- User status queries are batched by Convex
- Skeleton loaders prevent layout shift
- Images should use next/image for optimization in production
