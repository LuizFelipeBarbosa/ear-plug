# Getting Started with Ear-Plug

This guide will help you get up and running with Ear-Plug development in under 15 minutes.

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+** (check with `node --version`)
- **pnpm 9.0.0+** (check with `pnpm --version`)
- **Git** for version control

If you need to install these:

```bash
# Install Node.js via nvm
nvm install 20
nvm use 20

# Install pnpm
npm install -g pnpm@9
```

---

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd ear-plug

# Install all dependencies
pnpm install
```

### 2. Set Up Environment Variables

Copy the example environment files:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
```

Edit the `.env.local` files with your credentials:

**Web (`apps/web/.env.local`):**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

**Mobile (`apps/mobile/.env.local`):**
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
EXPO_PUBLIC_CONVEX_URL=your_convex_deployment_url
```

### 3. Start Convex Backend

In one terminal, start the Convex development server:

```bash
npx convex dev
```

This will:
- Start the local Convex development server
- Generate TypeScript types in `convex/_generated/`
- Watch for schema and function changes

### 4. Start the Web Application

In another terminal:

```bash
pnpm dev:web
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

### 5. (Optional) Seed Sample Data

To populate the database with sample venues, bands, and events:

```bash
npx convex run seed:seedDatabase
```

To clear the seed data later:

```bash
npx convex run seed:clearDatabase
```

---

## Understanding User Roles

Ear-Plug has two distinct user roles that determine the app experience:

### Fans

Fans are live music enthusiasts who:
- Discover events on an interactive map
- RSVP to upcoming shows
- Like and save events for later
- Follow their favorite bands and venues
- Receive notifications about new events

**Fan Home Screen:** Interactive map showing nearby events with filtering by genre and distance.

### Musicians

Musicians are artists/bands who:
- Create and manage their band profile
- Post upcoming gigs and events
- View booking opportunities (open dates)
- Apply to venue open dates
- Message venues about bookings
- Track RSVP counts and fan engagement

**Musician Home Screen:** Dashboard with stats, suggested venues, and open booking opportunities.

---

## Key Concepts

### Events

An event represents a live music show. Events have:
- **Title** - The name of the show
- **Band** - The performing artist/band
- **Venue** - Where the show takes place
- **Date/Time** - When it happens
- **Capacity** - Maximum attendees
- **Price** - Ticket cost (in cents, 0 = free)
- **Genres** - Music genres (indie, rock, jazz, electronic, folk, pop, alternative)
- **Status** - confirmed, hold, or available

### Venues

Venues are live music locations in the Bay Area. They include:
- Name and address
- GPS coordinates for map display
- Capacity
- Typical genres hosted

Venues are created either from seed data or when musicians create events using Google Places autocomplete.

### Open Dates

Open dates are booking opportunities posted by venues. Musicians can:
- Browse available dates
- View offered compensation
- Apply with a message
- Track application status (pending, accepted, rejected)

### RSVPs vs Likes

- **RSVP** - Indicates you plan to attend. Shows in your calendar.
- **Like** - Save for later. Does not appear in calendar view.

Both are toggles - clicking again removes the RSVP/like.

---

## Project Structure Overview

```
Ear-Plug/
├── apps/
│   ├── web/           # Next.js 14 web application
│   └── mobile/        # Expo 51 mobile application
├── convex/            # Convex backend (database, queries, mutations)
├── packages/
│   ├── shared/        # Types, validation, constants shared across apps
│   └── tailwind-config/  # Design system tokens
└── docs/              # Documentation
```

### Web App (`apps/web/`)

- Built with Next.js 14 (App Router)
- Uses Clerk for authentication
- Google Maps for event discovery
- Tailwind CSS for styling

### Mobile App (`apps/mobile/`)

- Built with Expo 51 and Expo Router
- Uses Clerk for authentication
- React Native Maps
- NativeWind (Tailwind for React Native)

### Backend (`convex/`)

- Serverless functions (queries and mutations)
- Real-time database subscriptions
- Authentication via Clerk JWT
- No separate deployment needed during development

---

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers (web + mobile + Convex) |
| `pnpm dev:web` | Web only at localhost:3000 |
| `pnpm dev:mobile` | Expo mobile only |
| `pnpm dev:convex` | Convex backend only |
| `pnpm build` | Build all apps |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | TypeScript checks |

---

## Next Steps

Now that you have the project running:

1. **Explore the app** - Sign up, choose a role, and navigate around
2. **Read the tutorials** - Learn how to add features in `/docs/guides/tutorials/`
3. **Understand the concepts** - Deep dive into user roles, real-time data in `/docs/guides/concepts/`
4. **Check the API reference** - Full API documentation in `/docs/_discovery/api-catalog.md`

---

## Getting Help

- **Convex types not generating?** Run `npx convex dev` to regenerate
- **Shared package changes not working?** Restart the dev server
- **Auth redirect loops?** Check `apps/web/middleware.ts` configuration
- **More issues?** See `/docs/guides/how-to/troubleshooting.md`
