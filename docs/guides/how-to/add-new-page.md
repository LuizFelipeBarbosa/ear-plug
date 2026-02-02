# How To: Add a New Page

This guide explains how to add new pages to both the web and mobile applications.

---

## Web Application (Next.js)

The web app uses Next.js App Router with file-based routing.

### Adding a Public Page

Public pages are accessible without authentication.

**1. Create the page file:**

```typescript
// apps/web/src/app/about/page.tsx
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-night text-white p-8">
      <h1 className="text-4xl font-oswald mb-4">About Ear-Plug</h1>
      <p className="text-zinc-400">
        Connecting Bay Area music fans with local artists.
      </p>
    </div>
  );
}
```

**2. Add to public routes in middleware:**

```typescript
// apps/web/middleware.ts
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/about",              // Add new public route
]);
```

**3. Access at:** `http://localhost:3000/about`

---

### Adding a Protected Page

Protected pages require authentication.

**1. Create the page in the `(app)` route group:**

```typescript
// apps/web/src/app/(app)/settings/page.tsx
"use client";

import { useCurrentUser } from "@/hooks/useUser";

export default function SettingsPage() {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center">
        <div className="animate-pulse w-8 h-8 bg-lime" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-night text-white p-8">
      <h1 className="text-3xl font-oswald mb-6">Settings</h1>
      <div className="bg-night-secondary rounded-lg p-6">
        <p>Welcome, {user?.name}</p>
        {/* Settings content */}
      </div>
    </div>
  );
}
```

**2. Access at:** `http://localhost:3000/settings` (redirects to sign-in if not authenticated)

---

### Adding a Dynamic Page

For pages with dynamic segments (e.g., `/gig/[id]`).

**1. Create with bracket notation:**

```typescript
// apps/web/src/app/(app)/artist/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function ArtistPage() {
  const params = useParams();
  const bandId = params.id as Id<"bands">;

  const band = useQuery(api.bands.getById, { bandId });

  if (band === undefined) {
    return <LoadingState />;
  }

  if (band === null) {
    return <NotFoundState />;
  }

  return (
    <div className="min-h-screen bg-night text-white p-8">
      <h1 className="text-4xl font-oswald">{band.name}</h1>
      <p className="text-zinc-400">{band.location}</p>
      {/* Band details */}
    </div>
  );
}
```

**2. Link to the page:**

```typescript
import Link from "next/link";

<Link href={`/artist/${band._id}`}>
  View Artist
</Link>
```

---

### Adding a Layout

Layouts wrap pages and persist across navigation.

```typescript
// apps/web/src/app/(app)/settings/layout.tsx
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-night">
      <nav className="border-b border-zinc-800 p-4">
        <h2 className="text-xl font-oswald text-white">Settings</h2>
      </nav>
      <main className="p-8">
        {children}
      </main>
    </div>
  );
}
```

---

## Mobile Application (Expo)

The mobile app uses Expo Router, which is similar to Next.js App Router.

### Adding a Tab Screen

**1. Create the screen file:**

```typescript
// apps/mobile/app/(app)/(tabs)/discover/index.tsx
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DiscoverScreen() {
  return (
    <SafeAreaView className="flex-1 bg-night">
      <ScrollView className="flex-1 px-4">
        <Text className="text-2xl font-oswald text-white mb-4">
          Discover
        </Text>
        {/* Content */}
      </ScrollView>
    </SafeAreaView>
  );
}
```

**2. Add to tab navigator:**

```typescript
// apps/mobile/app/(app)/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Compass } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ /* ... */ }}>
      {/* Existing tabs */}
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => <Compass size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

---

### Adding a Stack Screen

For screens that push onto the navigation stack.

**1. Create the screen:**

```typescript
// apps/mobile/app/(app)/event-detail/[id].tsx
import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useQuery(api.events.getById, { eventId: id });

  if (event === undefined) {
    return <LoadingState />;
  }

  return (
    <ScrollView className="flex-1 bg-night">
      <Text className="text-2xl font-bold text-white">{event?.title}</Text>
      {/* Event details */}
    </ScrollView>
  );
}
```

**2. Add to stack layout:**

```typescript
// apps/mobile/app/(app)/_layout.tsx
import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="event-detail/[id]"
        options={{
          title: "Event",
          headerStyle: { backgroundColor: "#0F0F0F" },
          headerTintColor: "#fff",
        }}
      />
    </Stack>
  );
}
```

**3. Navigate to the screen:**

```typescript
import { router } from "expo-router";

// Programmatic navigation
router.push(`/event-detail/${event._id}`);

// Or with Link
import { Link } from "expo-router";

<Link href={`/event-detail/${event._id}`} asChild>
  <TouchableOpacity>
    <Text>View Details</Text>
  </TouchableOpacity>
</Link>
```

---

### Adding a Modal

```typescript
// apps/mobile/app/(app)/filter-modal.tsx
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";

export default function FilterModal() {
  return (
    <View className="flex-1 bg-night p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl font-bold text-white">Filters</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-lime">Done</Text>
        </TouchableOpacity>
      </View>
      {/* Filter options */}
    </View>
  );
}
```

```typescript
// In _layout.tsx
<Stack.Screen
  name="filter-modal"
  options={{
    presentation: "modal",
    title: "Filters",
  }}
/>
```

---

## Page Structure Patterns

### Standard Page Template (Web)

```typescript
// apps/web/src/app/(app)/[feature]/page.tsx
"use client";

import { useCurrentUser } from "@/hooks/useUser";

export default function FeaturePage() {
  const { user, isLoading, isFan, isMusician } = useCurrentUser();

  // 1. Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center">
        <div className="animate-pulse w-8 h-8 bg-lime" />
      </div>
    );
  }

  // 2. Role-based rendering (if needed)
  if (isFan) {
    return <FanFeatureView />;
  }

  return <MusicianFeatureView />;
}

function FanFeatureView() {
  return (
    <div className="min-h-screen bg-night text-white">
      {/* Fan-specific content */}
    </div>
  );
}

function MusicianFeatureView() {
  return (
    <div className="min-h-screen bg-night text-white">
      {/* Musician-specific content */}
    </div>
  );
}
```

### Standard Screen Template (Mobile)

```typescript
// apps/mobile/app/(app)/(tabs)/[feature]/index.tsx
import { View, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/useUser";

export default function FeatureScreen() {
  const { user, isLoading, isFan } = useCurrentUser();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-night" edges={["top"]}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#C2FF00"
          />
        }
      >
        {isFan ? <FanContent /> : <MusicianContent />}
      </ScrollView>
    </SafeAreaView>
  );
}
```

---

## File Naming Conventions

| Type | Web | Mobile |
|------|-----|--------|
| Regular page | `page.tsx` | `index.tsx` |
| Layout | `layout.tsx` | `_layout.tsx` |
| Dynamic segment | `[param]/page.tsx` | `[param].tsx` |
| Route group | `(group)/` | `(group)/` |
| Not found | `not-found.tsx` | `[...unmatched].tsx` |

---

## Checklist

Before considering your page complete:

- [ ] Page file created in correct location
- [ ] Loading state handled
- [ ] Error state handled
- [ ] Role-based access (if needed)
- [ ] Added to middleware (if public)
- [ ] Added to navigation (if tab/menu item)
- [ ] Responsive design tested
- [ ] Mobile equivalent created (if applicable)
- [ ] TypeScript compiles without errors

---

## Next Steps

- See [Adding a Feature](../tutorials/adding-a-feature.md) for complete feature implementation
- See [Working with Auth](../tutorials/working-with-auth.md) for protected pages
- See [Mobile Development](../tutorials/mobile-development.md) for Expo-specific details
