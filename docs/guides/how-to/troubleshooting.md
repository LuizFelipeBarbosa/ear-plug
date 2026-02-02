# Troubleshooting Guide

This guide covers common issues and their solutions when developing Ear-Plug.

---

## Convex Issues

### Types Not Generating

**Symptom:** TypeScript errors about missing types from `convex/_generated/`

**Solution:**

```bash
# Start or restart Convex dev server
npx convex dev
```

The `convex/_generated/` folder is auto-generated. If it is missing or outdated:

1. Ensure Convex CLI is installed: `npm install -g convex`
2. Run `npx convex dev` to regenerate
3. Restart your IDE if types still appear missing

---

### "Not authenticated" Errors

**Symptom:** Convex mutations throw "Not authenticated" even when logged in

**Possible Causes:**

1. **Clerk JWT not configured**
   - Check `convex/auth.config.ts` matches your Clerk settings
   - Verify the JWT template in Clerk dashboard

2. **ConvexProviderWithClerk not set up**
   ```typescript
   // Ensure your providers are correct
   <ClerkProvider>
     <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
       {children}
     </ConvexProviderWithClerk>
   </ClerkProvider>
   ```

3. **User not in database**
   - Check if `upsertUser` ran on sign-in
   - Verify webhook is configured

---

### Query Returns Undefined Forever

**Symptom:** `useQuery` returns `undefined` indefinitely

**Solutions:**

1. **Check Convex dev server is running**
   ```bash
   npx convex dev
   ```

2. **Verify Convex URL in environment**
   ```
   NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
   ```

3. **Check browser console for errors**

4. **Verify the query exists and is exported**
   ```typescript
   // convex/myModule.ts
   export const myQuery = query({ ... }); // Must be exported
   ```

---

### "Function not found" Error

**Symptom:** Error like `Function myModule:myFunction not found`

**Solutions:**

1. Ensure function is exported
2. Check for typos in function name
3. Run `npx convex dev` to sync functions
4. Clear browser cache and refresh

---

## Authentication Issues

### Redirect Loops

**Symptom:** Page keeps redirecting between sign-in and home

**Solutions:**

1. **Check middleware matcher**
   ```typescript
   // apps/web/middleware.ts
   const isPublicRoute = createRouteMatcher([
     "/",
     "/sign-in(.*)",
     "/sign-up(.*)",
     "/sso-callback(.*)", // Must include SSO callback
   ]);
   ```

2. **Verify Clerk environment variables**
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

3. **Check Clerk redirect URLs in dashboard**

---

### SSO Callback Errors

**Symptom:** Error after OAuth sign-in with Google/Apple

**Solutions:**

1. Add `/sso-callback` to public routes in middleware
2. Create the SSO callback page:
   ```typescript
   // apps/web/src/app/sso-callback/page.tsx
   import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

   export default function SSOCallback() {
     return <AuthenticateWithRedirectCallback />;
   }
   ```

3. Configure OAuth redirect URL in Clerk dashboard

---

### User Not Created After Sign-Up

**Symptom:** User signs in but Convex user record does not exist

**Solutions:**

1. **Verify webhook is configured**
   - Clerk Dashboard > Webhooks
   - Endpoint: `https://your-convex.convex.site/clerk-webhook`
   - Events: `user.created`, `user.updated`

2. **Check webhook handler**
   ```typescript
   // convex/http.ts
   http.route({
     path: "/clerk-webhook",
     method: "POST",
     handler: httpAction(async (ctx, request) => {
       // Verify this is handling events
     }),
   });
   ```

3. **Fall back to client-side creation**
   ```typescript
   // On sign-in success, call upsertUser
   const upsertUser = useMutation(api.users.upsertUser);
   await upsertUser({
     clerkId: user.id,
     email: user.primaryEmailAddress?.emailAddress ?? "",
     name: user.fullName ?? "User",
   });
   ```

---

## Next.js Issues

### Hydration Errors

**Symptom:** "Text content does not match server-rendered HTML"

**Solutions:**

1. **Add "use client" directive**
   ```typescript
   "use client"; // Add at top of file
   ```

2. **Avoid rendering client-only data on server**
   ```typescript
   // Bad: localStorage on server
   const value = localStorage.getItem("key");

   // Good: Check for window
   const [value, setValue] = useState<string | null>(null);
   useEffect(() => {
     setValue(localStorage.getItem("key"));
   }, []);
   ```

3. **Use dynamic import for client components**
   ```typescript
   const ClientComponent = dynamic(
     () => import("./ClientComponent"),
     { ssr: false }
   );
   ```

---

### Module Not Found Errors

**Symptom:** `Cannot find module '@/components/...'`

**Solutions:**

1. **Check path alias in tsconfig**
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

2. **Verify file exists at path**

3. **Restart TypeScript server in IDE**
   - VS Code: Cmd+Shift+P > "TypeScript: Restart TS Server"

---

### Build Errors with Shared Package

**Symptom:** Build fails with errors from `@ear-plug/shared`

**Solutions:**

1. **Build shared package first**
   ```bash
   cd packages/shared
   pnpm build
   ```

2. **Restart dev server**
   ```bash
   pnpm dev
   ```

3. **Check package.json exports**
   ```json
   {
     "exports": {
       "./types": "./src/types/index.ts",
       "./constants": "./src/constants/index.ts"
     }
   }
   ```

---

## Mobile (Expo) Issues

### Metro Bundler Errors

**Symptom:** Red screen with bundler error

**Solutions:**

1. **Clear Metro cache**
   ```bash
   npx expo start --clear
   ```

2. **Delete node_modules and reinstall**
   ```bash
   rm -rf node_modules
   pnpm install
   ```

3. **Reset watchman (macOS)**
   ```bash
   watchman watch-del-all
   ```

---

### Native Module Errors

**Symptom:** "Native module cannot be null"

**Solutions:**

1. **Rebuild native code**
   ```bash
   # iOS
   cd ios && pod install && cd ..
   npx expo run:ios

   # Android
   npx expo run:android
   ```

2. **Check Expo SDK compatibility**
   - Ensure native modules match Expo SDK version

---

### Environment Variables Not Loading

**Symptom:** `undefined` for environment variables

**Solutions:**

1. **Use correct prefix**
   ```
   EXPO_PUBLIC_MY_VAR=value  # Correct for Expo
   MY_VAR=value              # Won't work
   ```

2. **Restart Expo dev server after changes**

3. **Access correctly**
   ```typescript
   const url = process.env.EXPO_PUBLIC_CONVEX_URL;
   ```

---

## Styling Issues

### Tailwind Classes Not Applying

**Symptom:** Tailwind classes have no effect

**Solutions:**

1. **Check content paths in tailwind.config.js**
   ```javascript
   content: [
     "./src/**/*.{js,ts,jsx,tsx}",
     "./app/**/*.{js,ts,jsx,tsx}",
   ],
   ```

2. **Restart dev server after config changes**

3. **Verify globals.css is imported**
   ```typescript
   // app/layout.tsx
   import "./globals.css";
   ```

---

### NativeWind Classes Not Working

**Symptom:** Mobile styles not applying

**Solutions:**

1. **Check babel.config.js**
   ```javascript
   plugins: ["nativewind/babel"],
   ```

2. **Check tailwind.config.js includes mobile files**
   ```javascript
   content: [
     "./app/**/*.{js,ts,jsx,tsx}",
     "./components/**/*.{js,ts,jsx,tsx}",
   ],
   ```

3. **Clear Metro cache**
   ```bash
   npx expo start --clear
   ```

---

## Development Environment Issues

### Port Already in Use

**Symptom:** "Port 3000 is already in use"

**Solutions:**

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
pnpm dev -- --port 3001
```

---

### pnpm Install Fails

**Symptom:** Dependency installation errors

**Solutions:**

1. **Clear pnpm store**
   ```bash
   pnpm store prune
   ```

2. **Delete lockfile and reinstall**
   ```bash
   rm pnpm-lock.yaml
   pnpm install
   ```

3. **Check Node version**
   ```bash
   node --version  # Should be 20+
   nvm use 20
   ```

---

### TypeScript Errors in IDE but Build Passes

**Symptom:** IDE shows errors that don't exist in build

**Solutions:**

1. **Restart TypeScript server**
   - VS Code: Cmd+Shift+P > "TypeScript: Restart TS Server"

2. **Check for multiple TypeScript versions**
   ```bash
   pnpm why typescript
   ```

3. **Use workspace TypeScript**
   - VS Code: Bottom right > TypeScript version > "Select TypeScript Version" > "Use Workspace Version"

---

## Common Error Messages

### "Cannot read properties of undefined"

**Cause:** Accessing data before it loads

**Solution:**
```typescript
// Bad
const name = user.name;

// Good
const name = user?.name;

// Better
if (!user) return <Loading />;
const name = user.name;
```

---

### "Objects are not valid as a React child"

**Cause:** Rendering object directly

**Solution:**
```typescript
// Bad
<div>{user}</div>

// Good
<div>{user.name}</div>

// For debugging
<div>{JSON.stringify(user)}</div>
```

---

### "Each child in a list should have a unique key"

**Cause:** Missing key prop in map

**Solution:**
```typescript
// Bad
events.map(event => <EventCard event={event} />)

// Good
events.map(event => <EventCard key={event._id} event={event} />)
```

---

## Getting More Help

1. **Check Convex logs**
   - https://dashboard.convex.dev > Logs

2. **Check browser console**
   - Network tab for API errors
   - Console for JavaScript errors

3. **Check terminal output**
   - Dev server logs often show the root cause

4. **Search Convex Discord**
   - https://convex.dev/community

5. **Search Next.js/Expo documentation**
   - https://nextjs.org/docs
   - https://docs.expo.dev

---

## Preventive Measures

1. **Run type checks before committing**
   ```bash
   pnpm typecheck
   ```

2. **Run linter before committing**
   ```bash
   pnpm lint
   ```

3. **Test both web and mobile after shared package changes**

4. **Keep Convex dev server running during development**

5. **Use consistent Node version (20+)**
