# Tutorial: Mobile Development with Expo

This guide covers the mobile development workflow for Ear-Plug using Expo and Expo Router.

---

## Overview

The mobile app (`apps/mobile/`) is built with:

- **Expo 51** - React Native development platform
- **Expo Router 3.5** - File-based routing
- **NativeWind 4** - Tailwind CSS for React Native
- **React Native Maps** - Native map components
- **Clerk Expo** - Authentication

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Xcode (for iOS development on macOS)
- Android Studio (for Android development)
- Expo Go app on physical device (optional)

### Starting the Mobile Dev Server

From the project root:

```bash
# Start mobile dev server only
pnpm dev:mobile

# Or with Convex backend
pnpm dev
```

From the mobile app directory:

```bash
cd apps/mobile

# Start Expo dev server
pnpm dev

# Or directly with iOS/Android
pnpm ios     # iOS simulator
pnpm android # Android emulator
```

---

## Project Structure

```
apps/mobile/
├── app/                    # Expo Router pages
│   ├── (app)/             # Protected route group
│   │   ├── (tabs)/        # Tab navigation
│   │   │   ├── home/
│   │   │   ├── calendar/
│   │   │   ├── messages/
│   │   │   └── profile/
│   │   └── _layout.tsx
│   ├── sign-in.tsx
│   ├── sign-up.tsx
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry point
├── components/            # React Native components
├── hooks/                 # Custom hooks
├── lib/                   # Utilities
├── constants/             # App constants
├── app.json              # Expo config
├── babel.config.js       # Babel config
├── tailwind.config.js    # Tailwind/NativeWind config
└── package.json
```

---

## File-Based Routing

Expo Router uses file-based routing similar to Next.js:

### Basic Routes

```
app/
├── index.tsx              # /
├── sign-in.tsx            # /sign-in
├── sign-up.tsx            # /sign-up
└── (app)/
    └── (tabs)/
        ├── home/
        │   └── index.tsx  # /home
        ├── calendar/
        │   └── index.tsx  # /calendar
        └── profile/
            └── index.tsx  # /profile
```

### Dynamic Routes

```
app/
└── (app)/
    └── gig/
        └── [id].tsx       # /gig/abc123
```

### Route Groups

Route groups (in parentheses) do not affect the URL:

```
(app)/           # Adds auth protection layout
(tabs)/          # Adds tab navigation layout
```

---

## Creating a New Screen

### 1. Create the Screen File

```typescript
// app/(app)/(tabs)/discover/index.tsx
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DiscoverScreen() {
  return (
    <SafeAreaView className="flex-1 bg-night">
      <ScrollView className="flex-1 px-4">
        <Text className="text-2xl font-oswald text-white mb-4">
          Discover
        </Text>
        {/* Screen content */}
      </ScrollView>
    </SafeAreaView>
  );
}
```

### 2. Add to Tab Navigation (if needed)

```typescript
// app/(app)/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Home, Calendar, MessageSquare, User, Compass } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0F0F0F",
          borderTopColor: "#252525",
        },
        tabBarActiveTintColor: "#C2FF00",
        tabBarInactiveTintColor: "#71717A",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => <Compass size={24} color={color} />,
        }}
      />
      {/* Other tabs */}
    </Tabs>
  );
}
```

---

## Navigation

### Programmatic Navigation

```typescript
import { router } from "expo-router";

// Navigate to a route
router.push("/gig/abc123");

// Navigate and replace (no back button)
router.replace("/home");

// Go back
router.back();

// Navigate with params
router.push({
  pathname: "/gig/[id]",
  params: { id: "abc123" },
});
```

### Link Component

```typescript
import { Link } from "expo-router";

<Link href="/gig/abc123" asChild>
  <TouchableOpacity>
    <Text>View Event</Text>
  </TouchableOpacity>
</Link>
```

### Reading Route Params

```typescript
// app/(app)/gig/[id].tsx
import { useLocalSearchParams } from "expo-router";

export default function GigDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Use the id to fetch data
  const event = useEvent(id);

  return (/* ... */);
}
```

---

## Styling with NativeWind

NativeWind brings Tailwind CSS to React Native:

### Basic Usage

```typescript
import { View, Text } from "react-native";

export function MyComponent() {
  return (
    <View className="flex-1 bg-night p-4">
      <Text className="text-xl font-bold text-white">
        Hello World
      </Text>
      <View className="mt-4 bg-night-secondary rounded-lg p-3">
        <Text className="text-zinc-400">
          Card content
        </Text>
      </View>
    </View>
  );
}
```

### Custom Colors

The custom color palette is defined in `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        night: {
          DEFAULT: "#0F0F0F",
          secondary: "#1A1A1A",
          tertiary: "#252525",
        },
        lime: "#C2FF00",
        violet: "#8B5CF6",
      },
    },
  },
};
```

### Responsive Styles

```typescript
<View className="p-4 md:p-6 lg:p-8">
  <Text className="text-lg md:text-xl lg:text-2xl">
    Responsive Text
  </Text>
</View>
```

---

## Using Convex in Mobile

The Convex setup is identical to the web app:

### Provider Setup

```typescript
// app/_layout.tsx
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/clerk-expo";

export default function RootLayout() {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <Stack />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

### Using Queries and Mutations

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function EventList() {
  const events = useQuery(api.events.listUpcoming);
  const rsvp = useMutation(api.events.rsvp);

  if (events === undefined) {
    return <LoadingSpinner />;
  }

  return (
    <FlatList
      data={events}
      renderItem={({ item }) => (
        <EventCard
          event={item}
          onRsvp={() => rsvp({ eventId: item._id })}
        />
      )}
    />
  );
}
```

---

## Authentication in Mobile

### Clerk Expo Setup

```typescript
// app/_layout.tsx
import { ClerkProvider } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";

const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
};

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      {/* ... */}
    </ClerkProvider>
  );
}
```

### Auth Hooks

```typescript
import { useAuth, useUser } from "@clerk/clerk-expo";

export function ProfileScreen() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  if (!isSignedIn) {
    return <SignInPrompt />;
  }

  return (
    <View>
      <Text>Welcome, {user.firstName}!</Text>
      <Button title="Sign Out" onPress={() => signOut()} />
    </View>
  );
}
```

### Sign In Screen

```typescript
// app/sign-in.tsx
import { useSignIn } from "@clerk/clerk-expo";
import { useState } from "react";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async () => {
    if (!isLoaded) return;

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/home");
      }
    } catch (err) {
      console.error("Sign in error:", err);
    }
  };

  return (
    <View className="flex-1 bg-night p-4">
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        className="bg-night-secondary text-white p-3 rounded-lg mb-4"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        className="bg-night-secondary text-white p-3 rounded-lg mb-4"
      />
      <TouchableOpacity
        onPress={handleSignIn}
        className="bg-lime py-3 rounded-lg"
      >
        <Text className="text-night text-center font-bold">Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## Maps Integration

### React Native Maps Setup

```typescript
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

export function EventMap({ events }) {
  const initialRegion = {
    latitude: 37.8044,
    longitude: -122.2712,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={{ flex: 1 }}
      initialRegion={initialRegion}
      showsUserLocation
    >
      {events.map((event) => (
        <Marker
          key={event._id}
          coordinate={{
            latitude: event.venue.coordinates.lat,
            longitude: event.venue.coordinates.lng,
          }}
          title={event.title}
          description={event.venue.name}
          onPress={() => router.push(`/gig/${event._id}`)}
        />
      ))}
    </MapView>
  );
}
```

### Custom Map Markers

```typescript
import { Marker, Callout } from "react-native-maps";

<Marker coordinate={coordinates}>
  <View className="bg-lime p-2 rounded-full">
    <Music size={16} color="#0F0F0F" />
  </View>
  <Callout>
    <View className="p-2 min-w-[150px]">
      <Text className="font-bold">{event.title}</Text>
      <Text className="text-zinc-500">{event.venue.name}</Text>
    </View>
  </Callout>
</Marker>
```

---

## Common Mobile Patterns

### Safe Area Handling

```typescript
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children }) {
  return (
    <SafeAreaView className="flex-1 bg-night" edges={["top"]}>
      {children}
    </SafeAreaView>
  );
}
```

### Pull to Refresh

```typescript
import { RefreshControl, ScrollView } from "react-native";

export function EventList() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Convex auto-refreshes, so just wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#C2FF00"
        />
      }
    >
      {/* Content */}
    </ScrollView>
  );
}
```

### Keyboard Avoiding

```typescript
import { KeyboardAvoidingView, Platform } from "react-native";

export function FormScreen() {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      {/* Form inputs */}
    </KeyboardAvoidingView>
  );
}
```

---

## Debugging

### Development Tools

```bash
# Clear Metro cache
npx expo start --clear

# Open iOS simulator logs
npx react-native log-ios

# Open Android emulator logs
npx react-native log-android
```

### Expo Dev Tools

Press `j` in the terminal to open debugger (Hermes).

### Common Issues

1. **Metro bundler cache issues**
   ```bash
   npx expo start --clear
   ```

2. **Native module not found**
   ```bash
   cd ios && pod install && cd ..
   npx expo run:ios
   ```

3. **Environment variables not loading**
   - Ensure prefix is `EXPO_PUBLIC_`
   - Restart Expo dev server

---

## Building for Production

### Using EAS Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Local Development Builds

```bash
# iOS
npx expo run:ios --configuration Release

# Android
npx expo run:android --variant release
```

---

## Next Steps

- See [Adding a Feature](./adding-a-feature.md) for full feature implementation
- See [Working with Auth](./working-with-auth.md) for auth patterns
- See [Creating Convex Functions](./creating-convex-functions.md) for backend development
- Check Expo Router documentation: https://docs.expo.dev/router/introduction/
