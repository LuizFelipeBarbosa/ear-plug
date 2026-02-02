# Testing

This document covers the testing strategy, tools, and practices for the Ear-Plug project.

## Testing Overview

The Ear-Plug project employs multiple testing strategies:

| Type | Purpose | Tools |
|------|---------|-------|
| Unit Tests | Test individual functions and components | Jest, React Testing Library |
| Integration Tests | Test feature workflows | Jest, Convex Test Framework |
| E2E Tests | Test full user flows | Playwright (recommended) |
| Manual Testing | Verify UI/UX on real devices | Expo Go, Browser DevTools |

## Current Testing Setup

### Type Checking

TypeScript provides compile-time type safety:

```bash
# Run type checking across all packages
pnpm typecheck
```

### Linting

ESLint catches common issues:

```bash
# Run linting across all packages
pnpm lint

# Fix auto-fixable issues
pnpm lint --fix
```

## Unit Testing

### Setting Up Jest

For packages that need unit tests, install Jest:

```bash
# In the package directory
pnpm add -D jest @types/jest ts-jest
```

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

### Writing Unit Tests

#### Testing Utility Functions

```typescript
// packages/shared/src/utils/__tests__/distance.test.ts
import { calculateDistance } from '../distance';

describe('calculateDistance', () => {
  it('calculates distance between two coordinates', () => {
    // San Francisco to Oakland (~8 miles)
    const distance = calculateDistance(
      37.7749, -122.4194,  // San Francisco
      37.8044, -122.2712   // Oakland
    );

    expect(distance).toBeCloseTo(8.4, 1);
  });

  it('returns 0 for same coordinates', () => {
    const distance = calculateDistance(
      37.7749, -122.4194,
      37.7749, -122.4194
    );

    expect(distance).toBe(0);
  });
});
```

#### Testing Validation Schemas

```typescript
// packages/shared/src/validation/__tests__/schemas.test.ts
import { bandCreateSchema } from '../schemas';

describe('bandCreateSchema', () => {
  it('validates correct band data', () => {
    const validBand = {
      name: 'The Test Band',
      genres: ['rock', 'indie'],
      location: 'San Francisco, CA',
    };

    const result = bandCreateSchema.safeParse(validBand);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const invalidBand = {
      name: '',
      genres: ['rock'],
      location: 'San Francisco, CA',
    };

    const result = bandCreateSchema.safeParse(invalidBand);
    expect(result.success).toBe(false);
  });

  it('rejects invalid genre', () => {
    const invalidBand = {
      name: 'The Test Band',
      genres: ['invalid-genre'],
      location: 'San Francisco, CA',
    };

    const result = bandCreateSchema.safeParse(invalidBand);
    expect(result.success).toBe(false);
  });
});
```

## Component Testing

### Setting Up React Testing Library

```bash
# In apps/web
pnpm add -D @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

Create `jest.config.js` for web app:

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
```

Create `jest.setup.js`:

```javascript
import '@testing-library/jest-dom';
```

### Writing Component Tests

```typescript
// apps/web/src/components/events/__tests__/EventCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { EventCard } from '../EventCard';

// Mock the Convex hooks
jest.mock('convex/react', () => ({
  useMutation: () => jest.fn(),
}));

const mockEvent = {
  _id: 'event123',
  title: 'Test Concert',
  dateTime: Date.now() + 86400000, // Tomorrow
  rsvpCount: 50,
  capacity: 100,
  band: {
    _id: 'band123',
    name: 'The Test Band',
    genres: ['rock'],
  },
  venue: {
    _id: 'venue123',
    name: 'The Test Venue',
    address: '123 Test St',
    coordinates: { lat: 37.7749, lng: -122.4194 },
  },
};

describe('EventCard', () => {
  it('renders event information', () => {
    render(<EventCard event={mockEvent} />);

    expect(screen.getByText('Test Concert')).toBeInTheDocument();
    expect(screen.getByText('The Test Band')).toBeInTheDocument();
    expect(screen.getByText('The Test Venue')).toBeInTheDocument();
  });

  it('displays RSVP count', () => {
    render(<EventCard event={mockEvent} />);

    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('shows capacity indicator', () => {
    render(<EventCard event={mockEvent} />);

    // 50/100 = 50% capacity
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });
});
```

### Testing Hooks

```typescript
// apps/web/src/hooks/__tests__/useCurrentUser.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useCurrentUser } from '../useUser';
import { ConvexProvider } from 'convex/react';

// Mock Convex
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn()),
}));

import { useQuery } from 'convex/react';

describe('useCurrentUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns loading state initially', () => {
    (useQuery as jest.Mock).mockReturnValue(undefined);

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeUndefined();
  });

  it('returns user when loaded', async () => {
    const mockUser = {
      _id: 'user123',
      name: 'Test User',
      role: 'fan',
    };

    (useQuery as jest.Mock).mockReturnValue(mockUser);

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isFan).toBe(true);
  });
});
```

## Convex Backend Testing

### Convex Test Framework

Convex provides utilities for testing backend functions:

```typescript
// convex/__tests__/events.test.ts
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

test("list upcoming events", async () => {
  const t = convexTest(schema);

  // Seed test data
  const venueId = await t.run(async (ctx) => {
    return await ctx.db.insert("venues", {
      name: "Test Venue",
      address: "123 Test St",
      city: "San Francisco",
      capacity: 100,
      coordinates: { lat: 37.7749, lng: -122.4194 },
    });
  });

  const bandId = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      clerkId: "test-clerk-id",
      name: "Test User",
      email: "test@example.com",
      role: "musician",
      memberSince: Date.now(),
    });

    return await ctx.db.insert("bands", {
      userId,
      name: "Test Band",
      location: "San Francisco",
      createdAt: Date.now(),
    });
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("events", {
      title: "Test Event",
      bandId,
      venueId,
      dateTime: Date.now() + 86400000, // Tomorrow
      rsvpCount: 0,
      capacity: 100,
      status: "confirmed",
    });
  });

  // Test the query
  const events = await t.query(api.events.listUpcoming, {});

  expect(events).toHaveLength(1);
  expect(events[0].title).toBe("Test Event");
});
```

### Testing Mutations

```typescript
// convex/__tests__/rsvp.test.ts
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

test("RSVP to event", async () => {
  const t = convexTest(schema);

  // Setup test data
  const { eventId, userId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      clerkId: "test-user",
      name: "Test User",
      email: "test@example.com",
      role: "fan",
      memberSince: Date.now(),
    });

    const venueId = await ctx.db.insert("venues", {
      name: "Test Venue",
      address: "123 Test St",
      city: "San Francisco",
      capacity: 100,
      coordinates: { lat: 37.7749, lng: -122.4194 },
    });

    const bandId = await ctx.db.insert("bands", {
      userId,
      name: "Test Band",
      location: "San Francisco",
      createdAt: Date.now(),
    });

    const eventId = await ctx.db.insert("events", {
      title: "Test Event",
      bandId,
      venueId,
      dateTime: Date.now() + 86400000,
      rsvpCount: 0,
      capacity: 100,
      status: "confirmed",
    });

    return { eventId, userId };
  });

  // Mock authentication
  const asUser = t.withIdentity({ subject: "test-user" });

  // Execute RSVP mutation
  await asUser.mutation(api.events.rsvp, { eventId });

  // Verify RSVP was created
  const rsvp = await t.run(async (ctx) => {
    return await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", userId).eq("eventId", eventId)
      )
      .unique();
  });

  expect(rsvp).not.toBeNull();

  // Verify event rsvpCount was incremented
  const event = await t.run(async (ctx) => {
    return await ctx.db.get(eventId);
  });

  expect(event?.rsvpCount).toBe(1);
});
```

## E2E Testing

### Setting Up Playwright

```bash
# Install Playwright
pnpm add -D @playwright/test

# Install browsers
npx playwright install
```

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'pnpm dev:web',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Writing E2E Tests

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('shows sign in page', async ({ page }) => {
    await page.goto('/sign-in');

    await expect(page.locator('h1')).toContainText('Sign in');
  });

  test('redirects unauthenticated users from protected routes', async ({ page }) => {
    await page.goto('/home');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });
});
```

```typescript
// e2e/fan-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Fan User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated session
    // This would typically use Clerk's test mode
  });

  test('can view events on map', async ({ page }) => {
    await page.goto('/home');

    // Wait for map to load
    await expect(page.locator('[data-testid="google-map"]')).toBeVisible();

    // Check for event markers
    await expect(page.locator('.map-marker')).toHaveCount(expect.any(Number));
  });

  test('can RSVP to event', async ({ page }) => {
    await page.goto('/home');

    // Click on an event
    await page.locator('.event-card').first().click();

    // Click RSVP button
    await page.locator('button:has-text("RSVP")').click();

    // Verify RSVP confirmed
    await expect(page.locator('text=RSVP Confirmed')).toBeVisible();
  });
});
```

### Running E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Debug mode
npx playwright test --debug
```

## Manual Testing

### Web Application

1. **Browser DevTools**: Use Chrome/Firefox DevTools for:
   - Network requests monitoring
   - Console error checking
   - Performance profiling
   - Responsive design testing

2. **Clerk Test Mode**: Use Clerk's test accounts for authentication flows

3. **Convex Dashboard**: Monitor real-time data and function logs at https://dashboard.convex.dev

### Mobile Application

1. **Expo Go**: Fast iteration on physical devices
2. **iOS Simulator**: Test iOS-specific behaviors
3. **Android Emulator**: Test Android-specific behaviors
4. **Physical Devices**: Final verification on real hardware

### Testing Checklist

#### Authentication
- [ ] Sign up flow works
- [ ] Sign in flow works
- [ ] Sign out clears session
- [ ] Protected routes redirect correctly
- [ ] Role selection persists

#### Fan Features
- [ ] Map displays correctly
- [ ] Events load on map
- [ ] Event details show correctly
- [ ] RSVP functionality works
- [ ] Like/unlike works
- [ ] Calendar view shows RSVPs
- [ ] Profile displays correctly

#### Musician Features
- [ ] Dashboard loads
- [ ] Band profile can be created
- [ ] Events can be created
- [ ] Calendar shows bookings
- [ ] Messages send/receive
- [ ] Analytics display correctly

## Test Data

### Seeding Test Data

```bash
# Seed the database with sample data
npx convex run seed:seedDatabase

# Clear seeded data
npx convex run seed:clearDatabase
```

### Sample Data Structure

The seed script creates:
- Sample users (fans and musicians)
- Bands with various genres
- Venues in the Bay Area
- Upcoming and past events
- RSVPs and likes
- Open dates and applications

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Unit tests
        run: pnpm test

  e2e:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test
        env:
          NEXT_PUBLIC_CONVEX_URL: ${{ secrets.CONVEX_URL }}
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_KEY }}

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Coverage

### Generating Coverage Reports

```bash
# Run tests with coverage
pnpm test --coverage

# Generate HTML report
pnpm test --coverage --coverageReporters=html
```

### Coverage Goals

| Metric | Target |
|--------|--------|
| Statements | > 70% |
| Branches | > 60% |
| Functions | > 70% |
| Lines | > 70% |

Focus coverage on:
- Utility functions
- Validation schemas
- Complex business logic
- Custom hooks
