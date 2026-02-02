# Debugging

This document covers debugging strategies, tools, and common issue resolutions for the Ear-Plug project.

## Debugging Tools Overview

| Tool | Purpose | Platform |
|------|---------|----------|
| Browser DevTools | Web debugging, network, console | Web |
| VS Code Debugger | Source-level debugging | Web, Backend |
| Convex Dashboard | Backend logs and data inspection | Backend |
| React DevTools | Component inspection | Web, Mobile |
| Expo DevTools | Mobile app debugging | Mobile |
| Flipper | React Native debugging | Mobile |

## Web Application Debugging

### Browser Developer Tools

#### Console Debugging

```typescript
// Development logging
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG] User:', user);
  console.log('[DEBUG] Events:', events);
}
```

#### Network Tab

Monitor Convex WebSocket connections:
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "WS" (WebSocket)
4. Inspect Convex messages

#### React DevTools

Install the React DevTools browser extension for:
- Component tree inspection
- Props and state viewing
- Performance profiling
- Hook inspection

### VS Code Debugging

#### Launch Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm dev:web"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    },
    {
      "name": "Next.js: debug full stack",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm dev:web",
      "serverReadyAction": {
        "pattern": "started server on .+, url: (https?://.+)",
        "uriFormat": "%s",
        "action": "debugWithChrome"
      }
    }
  ]
}
```

#### Breakpoints

1. Click in the gutter next to line numbers to set breakpoints
2. Start debugging (F5)
3. Use Step Over (F10), Step Into (F11), Step Out (Shift+F11)

### Logging Patterns

```typescript
// apps/web/src/hooks/useUser.ts
export function useCurrentUser() {
  const user = useQuery(api.users.getCurrentUser);

  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group('[useCurrentUser]');
      console.log('User:', user);
      console.log('Loading:', user === undefined);
      console.log('Authenticated:', user !== null);
      console.groupEnd();
    }
  }, [user]);

  return { user, isLoading: user === undefined };
}
```

## Convex Backend Debugging

### Convex Dashboard

Access at https://dashboard.convex.dev

Features:
- **Logs**: View function execution logs
- **Data**: Browse and query tables
- **Functions**: View deployed functions
- **Settings**: Manage deployment

### Backend Logging

```typescript
// convex/events.ts
export const listUpcoming = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    console.log('[listUpcoming] Args:', args);

    const events = await ctx.db
      .query("events")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("dateTime"), Date.now()))
      .take(args.limit || 50);

    console.log('[listUpcoming] Found', events.length, 'events');

    return events;
  },
});
```

View logs in:
1. Convex Dashboard > Logs
2. Terminal running `npx convex dev`

### Inspecting Data

```typescript
// Quick data inspection in Convex functions
export const debugData = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const events = await ctx.db.query("events").collect();
    const bands = await ctx.db.query("bands").collect();

    return {
      userCount: users.length,
      eventCount: events.length,
      bandCount: bands.length,
      sampleUser: users[0],
      sampleEvent: events[0],
    };
  },
});
```

### Testing Queries Manually

```bash
# Run a query from command line
npx convex run events:listUpcoming '{"limit": 5}'

# Run a mutation
npx convex run events:create '{"title": "Test", ...}'
```

## Mobile Application Debugging

### Expo DevTools

Access at http://localhost:8081 when running `pnpm dev:mobile`

Features:
- Device logs
- Reload controls
- Developer menu access

### React Native Debugger

```bash
# Install standalone debugger
brew install --cask react-native-debugger

# Or use in-app debugger
# Shake device or Cmd+D (iOS) / Cmd+M (Android)
```

### Console Logging

```typescript
// Mobile logging visible in terminal and Expo DevTools
console.log('[Mobile] Component mounted');
console.warn('[Mobile] Deprecated API usage');
console.error('[Mobile] Error occurred', error);
```

### Remote Debugging

1. Shake device or press Cmd+D/Cmd+M
2. Select "Debug Remote JS"
3. Browser DevTools opens at http://localhost:8081/debugger-ui

## Common Issues & Solutions

### 1. Convex Types Not Generating

**Symptoms:**
- TypeScript errors about `api` imports
- `convex/_generated/` directory empty or outdated

**Solution:**
```bash
# Restart Convex dev server
npx convex dev

# If still failing, clear and restart
rm -rf convex/_generated
npx convex dev
```

### 2. Authentication Redirect Loops

**Symptoms:**
- Page keeps redirecting
- Cannot access protected routes

**Debug Steps:**
```typescript
// Add logging to middleware
// apps/web/middleware.ts
export default clerkMiddleware(async (auth, req) => {
  console.log('[Middleware] Path:', req.nextUrl.pathname);
  console.log('[Middleware] Is public:', isPublicRoute(req));

  const authState = await auth();
  console.log('[Middleware] Auth state:', authState.userId);

  if (!isPublicRoute(req)) {
    await auth().protect();
  }
});
```

**Common Causes:**
- Missing routes in `isPublicRoute` matcher
- Clerk keys misconfigured
- Cookies blocked in browser

### 3. Shared Package Changes Not Reflecting

**Symptoms:**
- Changes to `packages/shared` don't appear in apps
- Stale types or constants

**Solution:**
```bash
# Rebuild shared package
cd packages/shared
pnpm build

# Or restart all dev servers
pnpm dev
```

### 4. Real-Time Updates Not Working

**Symptoms:**
- Data doesn't update when changed
- UI shows stale information

**Debug Steps:**
```typescript
// Check if query is subscribing correctly
const events = useQuery(api.events.listUpcoming);

console.log('[Debug] Events value:', events);
console.log('[Debug] Is undefined:', events === undefined);
```

**Common Causes:**
- Using `"skip"` incorrectly
- Network/WebSocket issues
- Convex connection not established

### 5. Google Maps Not Loading

**Symptoms:**
- Gray map area
- "For development purposes only" watermark
- Console errors about API key

**Debug Steps:**
```typescript
// Check API key is loaded
console.log('[Maps] API Key:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
```

**Common Causes:**
- Missing API key in environment
- API not enabled in Google Cloud Console
- API key restrictions blocking requests

### 6. Mobile Build Errors

**Symptoms:**
- Build fails with native module errors
- Metro bundler crashes

**Solutions:**
```bash
# Clear Metro cache
cd apps/mobile
npx expo start --clear

# Rebuild native modules
npx expo prebuild --clean

# Clear all caches
rm -rf node_modules
rm -rf .expo
pnpm install
```

### 7. Hydration Mismatch Errors

**Symptoms:**
- Console warning: "Text content does not match server-rendered HTML"
- UI flickers on page load

**Debug Steps:**
```typescript
// Identify the component causing the mismatch
// Add useEffect to delay client-only rendering
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) {
  return null; // or skeleton
}
```

**Common Causes:**
- Date/time formatting differences
- Browser-specific values (localStorage, window.innerWidth)
- Random values generated differently on server/client

### 8. Query Returns Undefined Forever

**Symptoms:**
- `useQuery` always returns `undefined`
- Loading state never resolves

**Debug Steps:**
```typescript
// Check Convex connection
import { useConvex } from "convex/react";

function DebugConnection() {
  const convex = useConvex();
  console.log('[Debug] Convex client:', convex);

  // Check specific query
  const result = useQuery(api.users.getCurrentUser);
  console.log('[Debug] Query result:', result);

  return null;
}
```

**Common Causes:**
- Not wrapped in `ConvexProvider`
- Convex URL incorrect
- Backend function has error

## Performance Debugging

### React Profiler

```typescript
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: "mount" | "update",
  actualDuration: number
) {
  console.log(`[Profiler] ${id} ${phase}: ${actualDuration}ms`);
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <YourComponent />
    </Profiler>
  );
}
```

### Why Did You Render

```bash
# Install
pnpm add -D @welldone-software/why-did-you-render
```

```typescript
// apps/web/src/wdyr.ts
import React from 'react';

if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
  });
}
```

### Bundle Analysis

```bash
# Analyze Next.js bundle
cd apps/web
ANALYZE=true pnpm build
```

## Network Debugging

### Convex WebSocket Messages

In Browser DevTools:
1. Network tab > WS filter
2. Click on Convex WebSocket connection
3. View Messages tab
4. Inspect queries and mutations

### Request/Response Logging

```typescript
// apps/web/src/app/providers.tsx
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Enable verbose logging in development
if (process.env.NODE_ENV === 'development') {
  convex.debug = true;
}
```

## Error Boundaries

### Implementing Error Boundaries

```typescript
// apps/web/src/components/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-900 text-white">
          <h2>Something went wrong</h2>
          <pre>{this.state.error?.message}</pre>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Using Error Boundaries

```typescript
// apps/web/src/app/(app)/layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AppLayout({ children }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
```

## Debugging Checklist

### Before Asking for Help

1. [ ] Check browser console for errors
2. [ ] Check terminal for server errors
3. [ ] Verify environment variables are set
4. [ ] Check Convex dashboard logs
5. [ ] Verify network requests in DevTools
6. [ ] Try clearing caches and node_modules
7. [ ] Test in incognito/private window
8. [ ] Check if issue reproduces in production

### Information to Include in Bug Reports

- Error message and stack trace
- Steps to reproduce
- Browser/device information
- Environment (development/production)
- Recent code changes
- Relevant console logs
- Network request/response data
