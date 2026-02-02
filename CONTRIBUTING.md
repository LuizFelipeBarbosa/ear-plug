# Contributing to Ear-Plug

Thank you for your interest in contributing to Ear-Plug! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Environment Setup](#development-environment-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Branch Naming Conventions](#branch-naming-conventions)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to maintain a welcoming and inclusive community.

## Development Environment Setup

### Prerequisites

| Tool | Version | Installation |
|------|---------|--------------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) or use nvm |
| pnpm | 9+ | `npm install -g pnpm@9` |
| Git | Latest | [git-scm.com](https://git-scm.com) |

### External Services (Free Tiers Available)

- **Convex** - [dashboard.convex.dev](https://dashboard.convex.dev) - Backend database and functions
- **Clerk** - [dashboard.clerk.com](https://dashboard.clerk.com) - Authentication
- **Google Maps** - [console.cloud.google.com](https://console.cloud.google.com) - Maps API (optional)

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Ear-Plug.git
   cd Ear-Plug
   ```

3. **Set Node version** (if using nvm):
   ```bash
   nvm use 20
   ```

4. **Install dependencies**:
   ```bash
   pnpm install
   ```

5. **Configure environment variables**:

   Create `apps/web/.env.local`:
   ```env
   NEXT_PUBLIC_CONVEX_URL=https://your-app.convex.cloud
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key
   ```

   For mobile development, create `apps/mobile/.env`:
   ```env
   EXPO_PUBLIC_CONVEX_URL=https://your-app.convex.cloud
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```

6. **Initialize Convex**:
   ```bash
   npx convex dev
   ```
   This generates TypeScript types in `convex/_generated/`.

7. **Seed sample data** (optional):
   ```bash
   npx convex run seed:seedDatabase
   ```

8. **Start development servers**:
   ```bash
   pnpm dev:web    # Web app at localhost:3000
   pnpm dev:mobile # Expo mobile app
   ```

### IDE Setup

**VS Code** is recommended with these extensions:
- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features
- Expo Tools (for mobile development)

Workspace settings are included in `.vscode/settings.json`.

## Code Style Guidelines

### TypeScript

- Use strict TypeScript (`strict: true` is enabled)
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Import shared types from `@ear-plug/shared/types`

```typescript
// Preferred
import type { Genre, UserRole, Event } from "@ear-plug/shared/types";

function getEventsByGenre(genre: Genre): Event[] {
  // implementation
}

// Avoid
function getEventsByGenre(genre: any): any[] {
  // implementation
}
```

### React Components

- Use functional components with hooks
- Prefer named exports over default exports
- Add `"use client"` directive for client components in Next.js
- Follow existing component organization patterns

```typescript
"use client";

import { useState } from "react";
import type { Event } from "@ear-plug/shared/types";

interface EventCardProps {
  event: Event;
  onRsvp?: (eventId: string) => void;
}

export function EventCard({ event, onRsvp }: EventCardProps) {
  // Component implementation
}
```

### Convex Functions

- Use descriptive function names that indicate the action
- Validate all inputs using Convex validators
- Handle authentication consistently with `ctx.auth.getUserIdentity()`
- Return meaningful error messages or null for not-found cases

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    // Include related data
    const band = await ctx.db.get(event.bandId);
    const venue = await ctx.db.get(event.venueId);

    return { ...event, band, venue };
  },
});
```

### Styling

- Use Tailwind CSS utility classes
- Follow the design system in `packages/tailwind-config`
- Use design tokens for colors, spacing, and typography
- Apply mobile-first responsive design

```typescript
// Use design tokens
<div className="bg-surface text-primary p-4 rounded-lg shadow-brutal">
  <h2 className="font-display text-xl">Event Title</h2>
</div>

// Responsive design (mobile-first)
<div className="flex flex-col md:flex-row gap-4">
  {/* Content */}
</div>
```

### File Organization

```
apps/web/src/
├── app/              # Next.js App Router pages
│   ├── (app)/       # Protected routes (requires auth)
│   └── layout.tsx   # Root layout with providers
├── components/       # React components
│   ├── ui/          # Reusable UI components
│   ├── fan/         # Fan-specific components
│   ├── band/        # Musician-specific components
│   ├── maps/        # Map-related components
│   └── navigation/  # Navigation components
├── hooks/           # Custom React hooks
└── lib/             # Utilities and helpers

packages/shared/src/
├── types/           # TypeScript interfaces
├── validation/      # Zod schemas
├── constants/       # Shared constants
└── utils/           # Utility functions
```

## Pull Request Process

### Before You Start

1. Check existing issues to see if someone is already working on it
2. For significant changes, open an issue first to discuss the approach
3. Ensure your fork is up to date with the main branch

### Creating a Pull Request

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines

3. **Run quality checks**:
   ```bash
   pnpm lint        # ESLint
   pnpm typecheck   # TypeScript
   ```

4. **Test locally**:
   - Test on web at `localhost:3000`
   - Test both fan and musician roles
   - If changes affect mobile, test in Expo Go

5. **Commit your changes** following commit conventions:
   ```bash
   git commit -m "feat(events): add genre filtering to map view"
   ```

6. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a Pull Request on GitHub.

### PR Requirements Checklist

Before submitting, ensure:

- [ ] Code follows TypeScript and React best practices
- [ ] All lint checks pass (`pnpm lint`)
- [ ] TypeScript compiles without errors (`pnpm typecheck`)
- [ ] Changes are tested locally
- [ ] Both fan and musician roles work correctly (if applicable)
- [ ] Documentation is updated (if needed)
- [ ] Convex schema changes include any necessary considerations noted

### PR Description Template

```markdown
## Summary
Brief description of what this PR does.

## Changes
- Change 1
- Change 2

## Screenshots (for UI changes)
[Attach screenshots or screen recordings]

## Testing
Describe how you tested these changes.

## Related Issues
Fixes #123
```

### Review Process

PRs are reviewed for:
- **Code quality** - Clean, readable, maintainable code
- **Adherence to patterns** - Follows existing conventions
- **Performance** - No unnecessary re-renders or heavy computations
- **Security** - No exposed secrets, proper auth checks
- **Cross-platform** - Works on both web and mobile (if applicable)

## Testing Requirements

### Manual Testing Checklist

Before submitting a PR, verify:

- [ ] Web app works at `localhost:3000`
- [ ] Mobile app works in Expo Go (if changes affect mobile)
- [ ] Authentication flow (sign in/sign out/sign up)
- [ ] Fan role features work correctly
- [ ] Musician role features work correctly
- [ ] Real-time updates work (Convex subscriptions)
- [ ] Error states are handled gracefully

### Testing Convex Functions

Test queries and mutations using the Convex dashboard:

```bash
# Open Convex dashboard
npx convex dashboard

# Or run functions directly
npx convex run events:listUpcoming
npx convex run users:getCurrentUser
```

### Testing Different Scenarios

| Scenario | How to Test |
|----------|-------------|
| New user onboarding | Clear localStorage, sign out, visit `/` |
| Fan experience | Select "fan" role during onboarding |
| Musician experience | Select "musician" role during onboarding |
| Empty states | Clear seed data with `npx convex run seed:clearDatabase` |
| With sample data | Run `npx convex run seed:seedDatabase` |

## Branch Naming Conventions

Use descriptive branch names with prefixes:

| Prefix | Use Case | Example |
|--------|----------|---------|
| `feature/` | New features | `feature/event-sharing` |
| `fix/` | Bug fixes | `fix/map-marker-click` |
| `docs/` | Documentation | `docs/api-reference` |
| `refactor/` | Code restructuring | `refactor/hooks-consolidation` |
| `chore/` | Maintenance | `chore/update-dependencies` |
| `style/` | Formatting/styling | `style/button-hover-states` |
| `perf/` | Performance | `perf/lazy-load-images` |

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, no code change
- `refactor` - Code restructuring
- `perf` - Performance improvement
- `test` - Adding tests
- `chore` - Maintenance

**Examples:**
```bash
feat(events): add genre filtering to map view
fix(auth): resolve redirect loop on sign-in
docs(api): update events API documentation
refactor(hooks): extract shared event logic
chore(deps): update convex to v1.17
```

## Common Issues & Solutions

### Convex Types Not Generating

```bash
# Run Convex dev to regenerate types
npx convex dev
```

### Shared Package Changes Not Reflecting

```bash
# Rebuild the shared package
cd packages/shared
pnpm build

# Or restart the dev server
```

### Authentication Redirect Loops

Check the Clerk middleware in `apps/web/middleware.ts` to ensure routes are correctly categorized as public or protected.

### Mobile Build Issues

```bash
# Clear Metro cache
cd apps/mobile
npx expo start --clear
```

## Questions?

- **Bugs & Feature Requests** - Open a [GitHub Issue](https://github.com/YOUR_ORG/Ear-Plug/issues)
- **Discussions** - Use [GitHub Discussions](https://github.com/YOUR_ORG/Ear-Plug/discussions)

Thank you for contributing to Ear-Plug!
