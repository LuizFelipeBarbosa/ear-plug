# Environment Variables

This document lists all environment variables used across the Ear-Plug monorepo.

## Overview

Environment variables are organized by application and service. Each application uses a specific prefix:
- **Web App (Next.js)**: `NEXT_PUBLIC_*` for client-side, no prefix for server-side
- **Mobile App (Expo)**: `EXPO_PUBLIC_*` for client-side
- **Convex Backend**: Configured via Convex dashboard and `auth.config.ts`

---

## Web Application (`apps/web/`)

### Required Variables

| Variable | Type | Description | Usage Location |
|----------|------|-------------|----------------|
| `NEXT_PUBLIC_CONVEX_URL` | String | Convex deployment URL | `apps/web/src/app/providers.tsx` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | String | Clerk publishable key (pk_test_...) | `apps/web/src/app/providers.tsx` |
| `CLERK_SECRET_KEY` | String | Clerk secret key (sk_test_...) - server-side only | Clerk middleware authentication |
| `CLERK_JWT_ISSUER_DOMAIN` | String | Clerk JWT issuer domain URL | JWT verification |

### Optional Variables

| Variable | Type | Description | Usage Location |
|----------|------|-------------|----------------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | String | Google Maps API key for map features | `apps/web/src/components/maps/PlaceAutocomplete.tsx`, `apps/web/src/components/fan/MapView.tsx`, `apps/web/src/components/ui/CityAutocomplete.tsx` |
| `NODE_ENV` | String | Node environment (development/production) | `apps/web/src/components/fan/ProfileView.tsx` |

### Example `.env.local` (Web)

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-app.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

---

## Mobile Application (`apps/mobile/`)

### Required Variables

| Variable | Type | Description | Usage Location |
|----------|------|-------------|----------------|
| `EXPO_PUBLIC_CONVEX_URL` | String | Convex deployment URL | `apps/mobile/app/_layout.tsx` |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | String | Clerk publishable key | `apps/mobile/app/_layout.tsx` |

### Optional Variables

| Variable | Type | Description | Usage Location |
|----------|------|-------------|----------------|
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | String | Google Maps API key | Environment variable (also requires native config in `app.json`) |
| `EXPO_PUBLIC_WEB_APP_URL` | String | Web base URL used to open RSVP ticket pages from mobile | `apps/mobile/app/gig/[id].tsx` |

### Native Configuration (`app.json`)

In addition to environment variables, Google Maps API keys must be configured natively:

```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_IOS_API_KEY"
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_ANDROID_API_KEY"
        }
      }
    }
  }
}
```

### Example `.env.local` (Mobile)

```env
# Convex
EXPO_PUBLIC_CONVEX_URL=https://your-app.convex.cloud

# Clerk
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Google Maps (also configure in app.json for native)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Web app base URL for opening ticket pages
EXPO_PUBLIC_WEB_APP_URL=https://your-web-app-domain.com
```

---

## Convex Backend (`convex/`)

### Dashboard Configuration

Convex environment variables are configured via the Convex dashboard, not `.env` files.

### Authentication Configuration

Located in `convex/auth.config.ts`:

```typescript
export default {
  providers: [
    {
      domain: "https://your-clerk-domain.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
```

**Note**: The `domain` must match your Clerk JWT issuer domain.

---

## Root Level (`/`)

### Turbo Configuration

File: `turbo.json`

Turbo automatically loads environment files matching `**/.env.*local` as global dependencies. This means changes to any `.env.local` file will invalidate the Turbo cache.

```json
{
  "globalDependencies": ["**/.env.*local"]
}
```

---

## Service Configuration Requirements

### Clerk Setup

1. Create a Clerk application at https://clerk.com
2. Configure JWT template for Convex integration
3. Set the JWT issuer domain in both:
   - `CLERK_JWT_ISSUER_DOMAIN` environment variable
   - `convex/auth.config.ts` provider domain

### Convex Setup

1. Create a Convex project at https://convex.dev
2. Get your deployment URL from the Convex dashboard
3. Configure Clerk authentication in Convex dashboard

### Google Maps Setup

1. Create a Google Cloud project
2. Enable Maps JavaScript API (web) and Maps SDK (iOS/Android)
3. Create API keys with appropriate restrictions:
   - Web: HTTP referrer restrictions
   - iOS: Bundle ID restrictions
   - Android: Package name + SHA-1 fingerprint restrictions

---

## Environment File Locations

| File | Purpose |
|------|---------|
| `/apps/web/.env.local` | Web app local environment |
| `/apps/web/.env.example` | Web app environment template |
| `/apps/mobile/.env.local` | Mobile app local environment |
| `/apps/mobile/.env.example` | Mobile app environment template |
| `/.env.local` | Root-level shared environment (for Convex CLI) |

---

## Security Notes

1. **Never commit** `.env.local` files to version control
2. **Server-side only** variables (like `CLERK_SECRET_KEY`) should NOT have the `NEXT_PUBLIC_` prefix
3. **API keys** should be restricted by domain/platform in the provider dashboard
4. The `.gitignore` should include all `.env*.local` files
