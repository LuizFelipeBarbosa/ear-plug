# Tech Stack Project Outline

## Related Diagrams

For visual representations of the tech stack and architecture, see:

- **[System Overview](../diagrams/system-overview.mermaid)** - High-level system components and their connections
- **[Component Diagram](../diagrams/component-diagram.mermaid)** - Detailed module relationships within the monorepo
- **[Deployment Diagram](../diagrams/deployment.mermaid)** - Infrastructure and deployment pipeline

## Overview

A modern full-stack application with a shared codebase serving both web and mobile platforms. The architecture prioritizes code reuse, type safety, and real-time data synchronization.

---

## Technology Stack

### Frontend (Web)
| Technology   | Purpose                         |
| ------------ | ------------------------------- |
| Next.js 14+  | React framework with App Router |
| Tailwind CSS | Utility-first styling           |
| TypeScript   | Type safety                     |

### Frontend (Mobile)
| Technology     | Purpose                       |
| -------------- | ----------------------------- |
| Expo (SDK 50+) | React Native framework        |
| NativeWind v4  | Tailwind CSS for React Native |
| TypeScript     | Type safety                   |

### Backend
| Technology | Purpose                                                 |
| ---------- | ------------------------------------------------------- |
| Convex     | Database, serverless functions, real-time subscriptions |

### Monorepo Tooling
| Technology | Purpose                                |
| ---------- | -------------------------------------- |
| Turborepo  | Build orchestration and caching        |
| pnpm       | Package manager with workspace support |

---

## Project Structure

```
/my-app
├── apps/
│   ├── web/                    # Next.js application
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   ├── components/     # Web-specific components
│   │   │   └── lib/            # Web-specific utilities
│   │   ├── public/
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── package.json
│   │
│   └── mobile/                 # Expo application
│       ├── src/
│       │   ├── app/            # Expo Router screens
│       │   ├── components/     # Mobile-specific components
│       │   └── lib/            # Mobile-specific utilities
│       ├── app.json
│       ├── tailwind.config.js
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared business logic
│   │   ├── src/
│   │   │   ├── types/          # Shared TypeScript types
│   │   │   ├── validation/     # Zod schemas
│   │   │   ├── utils/          # Helper functions
│   │   │   └── constants/      # Shared constants
│   │   └── package.json
│   │
│   └── tailwind-config/        # Shared Tailwind configuration
│       ├── base.js
│       └── package.json
│
├── convex/                     # Convex backend (shared)
│   ├── schema.ts               # Database schema
│   ├── functions/              # Serverless functions
│   │   ├── users.ts
│   │   ├── posts.ts
│   │   └── ...
│   ├── _generated/             # Auto-generated types & API
│   └── convex.config.ts
│
├── turbo.json                  # Turborepo configuration
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

---

## Shared Code Strategy

### What to Share

| Layer           | Shared                     | Platform-Specific              |
| --------------- | -------------------------- | ------------------------------ |
| Database schema | ✓ Convex schema            | —                              |
| API calls       | ✓ Convex queries/mutations | —                              |
| Types           | ✓ TypeScript interfaces    | —                              |
| Validation      | ✓ Zod schemas              | —                              |
| Business logic  | ✓ Pure functions           | —                              |
| Design tokens   | ✓ Colors, spacing, fonts   | —                              |
| UI Components   | —                          | React vs React Native elements |
| Navigation      | —                          | Next.js Router vs Expo Router  |
| Storage         | —                          | localStorage vs AsyncStorage   |

### Shared Tailwind Configuration

```js
// packages/tailwind-config/base.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f9fafb',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
};
```

---

## Authentication

### Recommended: Clerk

Clerk provides seamless SDKs for both Next.js and Expo with Convex integration.

```
User → Clerk Auth → JWT → Convex (validates & identifies user)
```

### Setup

| Platform | Package                                      |
| -------- | -------------------------------------------- |
| Web      | `@clerk/nextjs`                              |
| Mobile   | `@clerk/clerk-expo`                          |
| Backend  | `@clerk/clerk-sdk-node` (Convex integration) |

### Alternative Options
- Auth0
- Supabase Auth (with Convex as primary DB)
- Custom JWT implementation

---

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                        Convex                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Schema    │  │  Functions  │  │  Real-time  │     │
│  │  (Tables)   │  │ (Queries/   │  │   Sync      │     │
│  │             │  │  Mutations) │  │             │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└───────────────────────┬─────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            │   Generated Types &   │
            │      API Client       │
            └───────────┬───────────┘
                        │
          ┌─────────────┴─────────────┐
          │                           │
   ┌──────▼──────┐             ┌──────▼──────┐
   │   Next.js   │             │    Expo     │
   │    (Web)    │             │  (Mobile)   │
   │             │             │             │
   │ useQuery()  │             │ useQuery()  │
   │ useMutation │             │ useMutation │
   └─────────────┘             └─────────────┘
```

### Example Usage

```ts
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  }).index('by_clerk_id', ['clerkId']),

  posts: defineTable({
    authorId: v.id('users'),
    title: v.string(),
    content: v.string(),
    published: v.boolean(),
  }).index('by_author', ['authorId']),
});
```

```ts
// convex/functions/posts.ts
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('posts')
      .filter((q) => q.eq(q.field('published'), true))
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');
    
    // ... create post
  },
});
```

```tsx
// Used identically in both Next.js and Expo
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

function PostList() {
  const posts = useQuery(api.functions.posts.list);
  const createPost = useMutation(api.functions.posts.create);
  
  // Real-time updates work automatically on both platforms
}
```

---

## Development Workflow

### Commands

```bash
# Install dependencies
pnpm install

# Start all development servers
pnpm dev

# Start individual apps
pnpm dev:web        # Next.js on localhost:3000
pnpm dev:mobile     # Expo on localhost:8081
pnpm dev:convex     # Convex backend

# Build
pnpm build          # Build all
pnpm build:web      # Build web only

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### Environment Variables

```bash
# .env.local (web)
NEXT_PUBLIC_CONVEX_URL=https://your-app.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# .env (mobile) - managed via Expo
EXPO_PUBLIC_CONVEX_URL=https://your-app.convex.cloud
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
```

---

## Deployment

### Web (Next.js)

| Platform    | Notes                                    |
| ----------- | ---------------------------------------- |
| Vercel      | First-class Next.js support, recommended |
| Netlify     | Good alternative                         |
| AWS Amplify | If already in AWS ecosystem              |

### Mobile (Expo)

| Platform   | Notes                                       |
| ---------- | ------------------------------------------- |
| EAS Build  | Expo's cloud build service                  |
| EAS Submit | Automated App Store & Play Store submission |

### Backend (Convex)

Convex is fully managed. Deployment is automatic via:

```bash
npx convex deploy
```

---

## Estimated Timeline

| Phase         | Duration  | Deliverables                       |
| ------------- | --------- | ---------------------------------- |
| Setup         | 1-2 days  | Monorepo, tooling, base config     |
| Auth          | 2-3 days  | Clerk integration on all platforms |
| Core Features | 2-4 weeks | Depends on scope                   |
| Polish        | 1 week    | UI refinement, testing             |
| Deployment    | 2-3 days  | CI/CD, app store submissions       |

---

## Additional Considerations

### Testing
- **Unit tests**: Vitest (shared logic)
- **Component tests**: React Testing Library
- **E2E (web)**: Playwright
- **E2E (mobile)**: Detox or Maestro

### Monitoring
- **Error tracking**: Sentry (supports both platforms)
- **Analytics**: Mixpanel, Amplitude, or PostHog

### Future Scalability
- Convex scales automatically
- Consider CDN for static assets
- Image optimization via Next.js Image / Expo Image

---

## Quick Start

```bash
# Clone starter (if using template)
npx create-turbo@latest -e with-convex my-app
cd my-app

# Add Expo app
cd apps
npx create-expo-app mobile --template tabs
cd mobile
npx expo install nativewind tailwindcss

# Install shared dependencies
cd ../..
pnpm install

# Start development
pnpm dev
```