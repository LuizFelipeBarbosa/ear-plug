# Ear-Plug 🎧

**"Listen Local"** - A dual-sided platform connecting the Bay Area live music ecosystem.

## Overview

Ear-Plug is a mobile-first web and native application that serves two distinct user groups:
- **Fans** - Discover local shows, follow bands, and engage with the music scene
- **Musicians/Bands** - Promote performances, find gig opportunities, and grow your fanbase

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Web Frontend** | Next.js 14+, Tailwind CSS, TypeScript |
| **Mobile Frontend** | Expo (SDK 50+), NativeWind, TypeScript |
| **Backend** | Convex (database, real-time, serverless functions) |
| **Authentication** | Clerk |
| **Maps** | Google Maps API |
| **Monorepo** | Turborepo + pnpm |

## Project Structure

```
/Ear-Plug
├── apps/
│   ├── web/                    # Next.js web application
│   └── mobile/                 # Expo mobile application
├── packages/
│   ├── shared/                 # Shared types, validation, utilities
│   └── tailwind-config/        # Shared Tailwind design tokens
├── convex/                     # Convex backend (schema, functions)
├── turbo.json                  # Turborepo configuration
├── pnpm-workspace.yaml         # Workspace configuration
└── package.json                # Root package
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Convex account
- Clerk account
- Google Maps API key

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repo-url>
   cd Ear-Plug
   pnpm install
   ```

2. **Set up environment variables:**

   Create `.env.local` in `apps/web/`:
   ```env
   NEXT_PUBLIC_CONVEX_URL=https://your-app.convex.cloud
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key
   ```

   Create `.env` in `apps/mobile/`:
   ```env
   EXPO_PUBLIC_CONVEX_URL=https://your-app.convex.cloud
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key
   ```

3. **Initialize Convex:**
   ```bash
   npx convex dev
   ```

4. **Seed the database (optional):**
   ```bash
   npx convex run seed:seedDatabase
   ```

### Development

```bash
# Start all development servers
pnpm dev

# Start web only
pnpm dev:web

# Start mobile only
pnpm dev:mobile

# Start Convex backend
pnpm dev:convex
```

### Build

```bash
# Build all
pnpm build

# Build web only
pnpm build:web
```

## Features

### Fan Features
- 🗺️ Map-based event discovery with Google Maps
- 🔍 Search events by title, band, or venue
- 🎵 Filter by genre (Indie, Rock, Jazz, Electronic, Folk, Pop, Alternative)
- ❤️ Like and save events
- 🎟️ RSVP to events
- 📅 View RSVPs and liked events in calendar
- 🔔 Notifications for event reminders and updates
- 👤 Profile with stats and saved artists/venues

### Musician/Band Features
- 📊 Dashboard with performance stats
- 📅 Calendar showing upcoming shows with status
- 💬 Messaging with venues for booking coordination
- 📈 Analytics report with charts
- 🏢 Suggested venues based on genre
- 📋 Open dates browser to apply for gigs
- 👥 Fan/follower tracking

## API Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | OnboardingFlow | Role selection + auth |
| `/home` | MapView / BandDashboard | Role-based home |
| `/calendar` | CalendarView / BandCalendar | Events list |
| `/messages` | NotificationsView / BandMessages | Role-based |
| `/profile` | ProfileView / BandProfile | Role-based |
| `/gig/[id]` | EventDetails | Event detail page |

## Data Entities

- **Users** - Fan/Musician profiles
- **Bands** - Musician band profiles
- **Venues** - Bay Area music venues
- **Events** - Shows and performances
- **RSVPs** - Event attendance tracking
- **Likes** - Saved events
- **Messages** - Band-venue conversations
- **Notifications** - Event reminders and updates
- **Open Dates** - Venue booking opportunities
- **Applications** - Band applications to open dates

## Deployment

### Web (Vercel)
```bash
vercel deploy
```

### Mobile (EAS)
```bash
cd apps/mobile
eas build
eas submit
```

### Backend (Convex)
```bash
npx convex deploy
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `pnpm lint` and `pnpm typecheck`
5. Submit a pull request

## License

MIT
