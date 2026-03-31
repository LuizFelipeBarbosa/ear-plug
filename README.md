# Ear-Plug

**"Listen Local"** - A platform connecting Bay Area live music fans with musicians and bands.

Ear-Plug is a mobile-first web and native application that bridges the gap between local music enthusiasts and the artists who perform in their communities. Fans discover nearby shows on an interactive map, while musicians manage their gigs, connect with venues, and grow their fanbase.

## Key Features

### For Fans
- **Map-Based Discovery** - Find live shows near you with an interactive Google Maps interface
- **Genre Filtering** - Filter by Indie, Rock, Jazz, Electronic, Folk, Pop, or Alternative
- **Distance Radius** - Search within 1, 5, 10, 25, or 50 miles
- **RSVP & Likes** - Mark events you're attending or interested in
- **Calendar View** - See your upcoming RSVPs and liked events
- **Artist Following** - Save bands and get notified about their new shows
- **Venue Tracking** - Follow venues to hear about new events
- **Band Profiles** - Browse band pages with media galleries, bios, and upcoming shows

### For Musicians
- **Band Dashboard** - View performance stats, RSVP counts, and fan growth
- **Show Management** - Create and manage gigs with venue selection via Google Places
- **Guest List Controls** - Manage attendance lists with check-in tracking and address visibility settings
- **Media Posts** - Share photos and videos with fans via a band feed (likes, comments)
- **Band Membership** - Invite members with role-based access (owner, admin, member)
- **Open Dates Browser** - Find and apply to venue booking opportunities
- **Venue Messaging** - Direct communication with venues for booking coordination
- **Analytics** - Charts and insights on your audience engagement

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or higher
- [pnpm](https://pnpm.io/) 9 or higher
- [Convex](https://convex.dev) account (free tier available)
- [Clerk](https://clerk.com) account (free tier available)
- [Google Maps API key](https://console.cloud.google.com) (optional, for map features)

### Installation

```bash
# Clone the repository
git clone https://github.com/LuizFelipeBarbosa/Ear-Plug.git
cd Ear-Plug

# Use correct Node version (if using nvm)
nvm use 20

# Install dependencies
pnpm install

# Set up environment files
cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.local with your API keys
```

### Configure Environment Variables

Create `apps/web/.env.local`:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-app.convex.cloud
CONVEX_DEPLOYMENT=prod:your-app
# Optional: Use dev deployments for local development
# CONVEX_DEPLOYMENT=dev:your-project-name

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

Create `apps/mobile/.env.local`:

```env
# Convex
EXPO_PUBLIC_CONVEX_URL=https://your-app.convex.cloud

# Clerk
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Google Maps (also configure in app.json for native)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Web app base URL for opening ticket pages from mobile
EXPO_PUBLIC_WEB_APP_URL=https://your-web-app-domain.com
```

### Start Development

```bash
# Terminal 1: Start Convex backend (generates types)
npx convex dev

# Terminal 2: Start web development server
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Optional: Seed Sample Data

```bash
npx convex run seed:seedDatabase
```

This populates the database with sample Bay Area venues, bands, and events for testing.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Monorepo** | Turborepo + pnpm workspaces |
| **Web Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS |
| **Mobile Frontend** | Expo 51, Expo Router, NativeWind |
| **Backend** | Convex (database, real-time subscriptions, serverless functions) |
| **Authentication** | Clerk |
| **Maps** | Google Maps (web: @vis.gl/react-google-maps, mobile: react-native-maps) |
| **Validation** | Zod |
| **Language** | TypeScript |

## Project Structure

```
Ear-Plug/
├── apps/
│   ├── web/                    # Next.js web application
│   │   ├── src/app/           # App Router pages and layouts
│   │   ├── src/components/    # React components
│   │   │   ├── auth/          # Authentication components
│   │   │   ├── band/          # Musician dashboard, calendar, slots, guest lists
│   │   │   ├── fan/           # Map discovery, calendar, profile, notifications
│   │   │   ├── events/        # Shared event components
│   │   │   ├── maps/          # Google Maps integration
│   │   │   ├── navigation/    # Bottom nav
│   │   │   ├── onboarding/    # Role selection flow
│   │   │   ├── profile/       # Workspace switcher
│   │   │   └── ui/            # Reusable UI primitives
│   │   └── src/hooks/         # Custom hooks wrapping Convex
│   └── mobile/                 # Expo mobile application
│       └── app/               # Expo Router screens
├── packages/
│   ├── shared/                 # Shared types, validation schemas, utilities
│   └── tailwind-config/        # Design system tokens (brutalist dark theme)
├── convex/                     # Convex backend (schema, queries, mutations)
│   ├── schema.ts              # Database schema (17 tables)
│   ├── users.ts               # User operations
│   ├── events.ts              # Event management
│   ├── bands.ts               # Band profiles
│   ├── bandMembers.ts         # Band membership & invites
│   ├── bandMediaSlots.ts      # Fixed 6-slot band profile media
│   ├── venues.ts              # Venue data
│   ├── messages.ts            # Messaging system
│   ├── notifications.ts       # Platform notifications
│   └── seed.ts                # Sample data seeding
└── docs/                       # Documentation
```

## Available Commands

```bash
# Development
pnpm dev              # Start all dev servers (web + mobile + convex)
pnpm dev:web          # Web only at localhost:3000
pnpm dev:mobile       # Expo mobile
pnpm dev:convex       # Convex backend

# Build & Quality
pnpm build            # Build all apps
pnpm build:web        # Build web app only
pnpm lint             # ESLint across all packages
pnpm typecheck        # TypeScript checks
pnpm clean            # Clean build artifacts + node_modules

# Convex
npx convex dev        # Local development + type generation
npx convex deploy     # Production deployment

# Mobile (from apps/mobile/)
pnpm ios              # iOS simulator
pnpm android          # Android emulator
```

## Database Overview

Convex powers the real-time backend with 19 tables:

| Table | Purpose |
|-------|---------|
| `users` | Clerk-linked profiles (fan or musician role) |
| `bands` | Musician band profiles with multi-genre support |
| `bandMemberships` | Shared workspace access with role-based permissions |
| `bandInvites` | Pending/accepted/declined member invitations |
| `bandMediaSlots` | Fixed 6-slot media board for band profiles |
| `venues` | Bay Area venues with coordinates |
| `events` | Live music shows with status and address visibility |
| `rsvps` | User event attendance with check-in tracking |
| `eventTickets` | One-time QR tickets issued for RSVPs |
| `eventCheckinStaff` | Event-scoped door staff scanner access |
| `likes` | User saved events |
| `savedArtists` | Fan follows for bands |
| `savedVenues` | Fan saved venues |
| `conversations` | Band-venue messaging threads |
| `messages` | Individual messages |
| `conversationReads` | Per-user read cursors for unread counts |
| `notifications` | Event reminders and updates |
| `openDates` | Venue booking opportunities |
| `applications` | Band applications to open dates |

## Documentation

Detailed documentation is available in the [docs/](./docs/) directory:

- [Architecture Overview](./docs/architecture/overview.md)
- [Environment Variables](./docs/_discovery/environment-variables.md)
- [API Reference](./docs/api/)
- [Design System](./docs/design/)
- [Product Requirements](./docs/PRD.md)

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

Key points:
- Fork the repository and create a feature branch
- Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
- Run `pnpm lint` and `pnpm typecheck` before submitting
- Include screenshots for UI changes

## Security

For security concerns, please see our [Security Policy](SECURITY.md).

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to maintain a welcoming community.

---

Built with Convex, Next.js, Expo, and Clerk
