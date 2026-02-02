# Contributing to Ear-Plug

Thank you for your interest in contributing to Ear-Plug! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Testing](#testing)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to maintain a welcoming and inclusive community.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Git
- Convex account (free tier available)
- Clerk account (free tier available)
- Google Maps API key

### Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Ear-Plug.git
   cd Ear-Plug
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Set up environment variables** (see [Environment Variables](docs/getting-started/environment-variables.md))

5. **Start the development servers**:
   ```bash
   pnpm dev
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

- `feature/` - New features (e.g., `feature/event-sharing`)
- `fix/` - Bug fixes (e.g., `fix/map-marker-click`)
- `docs/` - Documentation updates (e.g., `docs/api-reference`)
- `refactor/` - Code refactoring (e.g., `refactor/hooks-structure`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)

### Making Changes

1. **Create a new branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Run quality checks**:
   ```bash
   pnpm lint        # ESLint
   pnpm typecheck   # TypeScript
   ```

4. **Test your changes** locally

5. **Commit your changes** following commit message conventions

## Pull Request Process

### Before Submitting

- [ ] Code follows the project's coding standards
- [ ] All lint checks pass (`pnpm lint`)
- [ ] TypeScript compiles without errors (`pnpm typecheck`)
- [ ] Changes are tested locally on both web and mobile (if applicable)
- [ ] Documentation is updated (if needed)
- [ ] Convex schema changes include migration notes

### Submitting a PR

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub with:
   - Clear title describing the change
   - Description of what and why
   - Screenshots/videos for UI changes
   - Link to related issues

3. **Address review feedback** promptly

### Review Criteria

PRs are reviewed for:
- Code quality and readability
- Adherence to project patterns
- Performance implications
- Security considerations
- Mobile/web compatibility

## Coding Standards

### TypeScript

- Use strict TypeScript (`strict: true`)
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Export types from `@ear-plug/shared/types`

```typescript
// Good
import type { Genre, UserRole } from "@ear-plug/shared/types";

function getEventsByGenre(genre: Genre): Event[] {
  // ...
}

// Avoid
function getEventsByGenre(genre: any): any[] {
  // ...
}
```

### React Components

- Use functional components with hooks
- Prefer named exports
- Use `"use client"` directive for client components
- Follow the existing component structure

```typescript
"use client";

import { useState } from "react";

export function EventCard({ event }: EventCardProps) {
  // Component logic
}
```

### Convex Functions

- Use descriptive function names
- Validate inputs with Convex validators
- Handle authentication consistently
- Return meaningful error messages

```typescript
export const getById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;
    // ...
  },
});
```

### Styling

- Use Tailwind CSS classes
- Follow the design system in `packages/tailwind-config`
- Use design tokens (colors, spacing) from the config
- Mobile-first responsive design

### File Organization

```
apps/web/src/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── ui/          # Reusable UI components
│   ├── fan/         # Fan-specific components
│   └── band/        # Musician-specific components
├── hooks/           # Custom React hooks
└── lib/             # Utilities and helpers
```

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, no code change
- `refactor` - Code restructuring
- `perf` - Performance improvement
- `test` - Adding tests
- `chore` - Maintenance

### Examples

```bash
feat(events): add genre filtering to map view

fix(auth): resolve redirect loop on sign-in

docs(api): update events API documentation

refactor(hooks): extract shared event logic to useSharedEvents
```

## Testing

### Manual Testing Checklist

Before submitting a PR, test:

- [ ] Web app at `localhost:3000`
- [ ] Mobile app in Expo Go (if applicable)
- [ ] Both fan and musician user roles
- [ ] Authentication flow (sign in/out)
- [ ] Core features affected by changes

### Convex Testing

Test Convex functions in the dashboard:
```bash
npx convex dashboard
```

Or run functions directly:
```bash
npx convex run events:listUpcoming
```

## Questions?

- Open a [GitHub Issue](https://github.com/YOUR_ORG/Ear-Plug/issues) for bugs or feature requests
- Check existing issues before creating new ones
- Use issue templates when available

Thank you for contributing to Ear-Plug!
