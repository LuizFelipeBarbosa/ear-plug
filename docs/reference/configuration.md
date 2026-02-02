# Configuration Reference

This document provides a complete reference for all configuration files in the Ear-Plug project.

---

## Table of Contents

1. [Root Configuration](#root-configuration)
2. [Web App Configuration](#web-app-configuration)
3. [Mobile App Configuration](#mobile-app-configuration)
4. [Shared Package Configuration](#shared-package-configuration)
5. [Convex Configuration](#convex-configuration)
6. [Environment Variables](#environment-variables)

---

## Root Configuration

### package.json

Location: `/package.json`

```json
{
  "name": "ear-plug",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "dev": "turbo dev",
    "dev:web": "turbo dev --filter=@ear-plug/web",
    "dev:mobile": "turbo dev --filter=@ear-plug/mobile",
    "dev:convex": "npx convex dev",
    "build": "turbo build",
    "build:web": "turbo build --filter=@ear-plug/web",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "clean": "turbo clean"
  }
}
```

**Key Fields:**
- `packageManager`: Enforces pnpm 9.0.0
- `engines.node`: Requires Node.js 20+
- Scripts use Turbo for task orchestration

---

### turbo.json

Location: `/turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {},
    "clean": {
      "cache": false
    }
  }
}
```

**Task Configuration:**

| Task | Cache | Depends On | Outputs |
|------|-------|------------|---------|
| build | Yes | Package builds | `.next/**`, `dist/**` |
| dev | No | - | - |
| lint | Yes | - | - |
| typecheck | Yes | - | - |
| clean | No | - | - |

---

### pnpm-workspace.yaml

Location: `/pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Workspaces:**
- `apps/web` - Next.js web application
- `apps/mobile` - Expo mobile application
- `packages/shared` - Shared types and utilities
- `packages/tailwind-config` - Shared Tailwind configuration

---

### .nvmrc

Location: `/.nvmrc`

```
20
```

Use with nvm: `nvm use`

---

### tsconfig.base.json

Location: `/tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

---

## Web App Configuration

### next.config.js

Location: `/apps/web/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ear-plug/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    // Enable if needed
  },
};

module.exports = nextConfig;
```

**Key Settings:**
- `transpilePackages`: Transpiles shared workspace package
- `images.remotePatterns`: Allowed image sources

---

### tsconfig.json (Web)

Location: `/apps/web/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [
      { "name": "next" }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Path Aliases:**
- `@/*` maps to `./src/*`

---

### tailwind.config.ts (Web)

Location: `/apps/web/tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";
import baseConfig from "@ear-plug/tailwind-config/base";

const config: Config = {
  presets: [baseConfig],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        oswald: ["var(--font-oswald)", "sans-serif"],
        geist: ["var(--font-geist)", "sans-serif"],
      },
    },
  },
};

export default config;
```

---

### middleware.ts

Location: `/apps/web/middleware.ts`

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

**Public Routes:**
- `/` - Landing/onboarding
- `/sign-in`, `/sign-up` - Auth pages
- `/sso-callback` - OAuth callback

---

## Mobile App Configuration

### app.json

Location: `/apps/mobile/app.json`

```json
{
  "expo": {
    "name": "Ear-Plug",
    "slug": "ear-plug",
    "version": "1.0.0",
    "scheme": "ear-plug",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0F0F0F"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.earplug.app",
      "config": {
        "googleMapsApiKey": "YOUR_IOS_MAPS_KEY"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0F0F0F"
      },
      "package": "com.earplug.app",
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_ANDROID_MAPS_KEY"
        }
      }
    },
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ]
  }
}
```

---

### babel.config.js (Mobile)

Location: `/apps/mobile/babel.config.js`

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "nativewind/babel",
      "react-native-reanimated/plugin",
    ],
  };
};
```

**Plugins:**
- `nativewind/babel`: Tailwind for React Native
- `react-native-reanimated/plugin`: Required for animations

---

### metro.config.js

Location: `/apps/mobile/metro.config.js`

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
```

---

### tailwind.config.js (Mobile)

Location: `/apps/mobile/tailwind.config.js`

```javascript
const baseConfig = require("@ear-plug/tailwind-config/base");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [baseConfig],
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
};
```

---

## Shared Package Configuration

### tailwind-config/base.js

Location: `/packages/tailwind-config/base.js`

```javascript
/** @type {import('tailwindcss').Config} */
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
        // Genre colors
        genre: {
          indie: "#f59e0b",
          rock: "#ef4444",
          jazz: "#6366f1",
          electronic: "#8b5cf6",
          folk: "#22c55e",
          pop: "#ec4899",
          alternative: "#06b6d4",
        },
      },
      fontFamily: {
        oswald: ["Oswald", "sans-serif"],
        geist: ["Geist", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
```

**Design Tokens:**

| Token | Value | Usage |
|-------|-------|-------|
| `night` | `#0F0F0F` | Primary background |
| `night-secondary` | `#1A1A1A` | Card backgrounds |
| `night-tertiary` | `#252525` | Hover states |
| `lime` | `#C2FF00` | Primary accent |
| `violet` | `#8B5CF6` | Secondary accent |

---

## Convex Configuration

### convex.json

Location: `/convex.json`

```json
{
  "project": "your-project-name",
  "team": "your-team-name",
  "prodUrl": "https://your-project.convex.cloud",
  "functions": "convex/"
}
```

---

### auth.config.ts

Location: `/convex/auth.config.ts`

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

**Configuration:**
- `domain`: Your Clerk frontend API URL
- `applicationID`: Must be "convex" to match JWT template

---

### schema.ts

Location: `/convex/schema.ts`

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    role: v.union(v.literal("fan"), v.literal("musician")),
    name: v.string(),
    email: v.string(),
    location: v.optional(v.string()),
    avatar: v.optional(v.string()),
    topGenres: v.optional(v.array(v.string())),
    memberSince: v.number(),
    showsAttended: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  bands: defineTable({ /* ... */ }),
  venues: defineTable({ /* ... */ }),
  events: defineTable({ /* ... */ }),
  // ... more tables
});
```

See `/docs/_discovery/api-catalog.md` for full schema.

---

## Environment Variables

### Web (.env.local)

Location: `/apps/web/.env.local`

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/home
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/home

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

### Mobile (.env.local)

Location: `/apps/mobile/.env.local`

```bash
# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Convex
EXPO_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

### Convex Environment Variables

Set via Convex Dashboard or CLI:

```bash
# Set variable
npx convex env set MY_VAR "value"

# List variables
npx convex env list
```

---

## Configuration Checklist

When setting up a new environment:

- [ ] Node.js 20+ installed
- [ ] pnpm 9+ installed
- [ ] `.env.local` files created for web and mobile
- [ ] Clerk application created and configured
- [ ] Convex project linked
- [ ] Google Maps API keys obtained (optional)
- [ ] Run `pnpm install` from root
- [ ] Run `npx convex dev` to initialize

---

## Related Documentation

- [Getting Started](/docs/guides/getting-started.md)
- [System Requirements](/docs/_discovery/system-requirements.md)
- [Troubleshooting](/docs/guides/how-to/troubleshooting.md)
