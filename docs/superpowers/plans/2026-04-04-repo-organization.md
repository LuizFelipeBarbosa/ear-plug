# Repository Organization Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split oversized files, clean up root clutter, and reorganize the shared package by domain — without breaking any functionality.

**Architecture:** Pure refactoring. No behavioral changes. Convex files split by domain responsibility with shared internal helpers exported for cross-file use. Shared package uses barrel re-exports to maintain identical public API. All app import paths updated to match new Convex API surface.

**Tech Stack:** TypeScript, Convex, Next.js 14, Expo/React Native, pnpm monorepo

---

### Task 1: Root & Docs Cleanup

**Files:**
- Modify: `.gitignore`
- Modify: `docs/README.md`
- Delete: `tmp/` (empty directory)
- Delete: `convex-err.log`, `pnpm-err.log` (tracked despite gitignore)

- [ ] **Step 1: Add missing gitignore entries**

Append to `.gitignore`:

```gitignore
# Error logs (committed before gitignore rule)
convex-err.log
pnpm-err.log

# Temp
tmp/
```

- [ ] **Step 2: Remove tracked files that are now gitignored**

```bash
git rm --cached convex-err.log pnpm-err.log
rm -rf tmp/
```

- [ ] **Step 3: Update `docs/README.md` table count**

Find the "Database Tables | 13" line and update to "Database Tables | 23" to reflect the actual schema.

- [ ] **Step 4: Remove debug console.log leftover**

In `apps/web/src/app/(app)/gig/[id]/page.tsx`, find and remove the `console.log("Share cancelled")` line.

- [ ] **Step 5: Remove unused dependency**

```bash
cd apps/web && pnpm remove use-places-autocomplete
```

- [ ] **Step 6: Verify build**

```bash
pnpm typecheck
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Clean up root clutter and remove unused dependency"
```

---

### Task 2: Split `packages/shared/src/types/index.ts` by Domain

**Files:**
- Create: `packages/shared/src/types/user.ts`
- Create: `packages/shared/src/types/band.ts`
- Create: `packages/shared/src/types/event.ts`
- Create: `packages/shared/src/types/ticket.ts`
- Create: `packages/shared/src/types/notification.ts`
- Create: `packages/shared/src/types/venue.ts`
- Create: `packages/shared/src/types/message.ts`
- Modify: `packages/shared/src/types/index.ts` (replace with barrel re-exports)

The current `types/index.ts` is 965 lines. Split into domain files, each containing the types that belong to that domain. The barrel `index.ts` re-exports everything so consumers see no change.

- [ ] **Step 1: Create `types/user.ts`**

Move these types: `UserRole`, `ProfileMode`, `User`, `BaseEntity`, `ProfileContext`, `SpotifyPersonalizationReason`, `SpotifyTopArtistPreview`, `SpotifyPersonalizationProfile`, `MapFilters`.

Include the `BaseEntity` interface here since `User` extends it, and other domain files will import `BaseEntity` from here.

- [ ] **Step 2: Create `types/band.ts`**

Move these types: `BandMemberRole`, `BandInviteStatus`, `BandInviteAssignableState`, `Genre`, `SocialLinks`, `Band`, `BandMembership`, `BandInvite`, `BandInviteAssignableUser`, `BandPostMediaType`, `BandMediaSlotIndex`, `BandMediaSlot`, `BandProfileMediaSlotView`, `BandStats`, `AnalyticsData`.

Import `BaseEntity` from `./user` and `Genre` is defined here, so other domain files that need `Genre` import from `./band`.

- [ ] **Step 3: Create `types/event.ts`**

Move these types: `EventStatus`, `EventParticipationRole`, `EventAddressVisibility`, `GuestRsvpType`, `GuestFilterType`, `EventPollOption`, `EventPoll`, `EventCohostInviteStatus`, `Event`, `EventWithDetails`, `RSVP`, `EventCohostInvite`, `EventGuestListItem`, `EventGuestListSummary`, `Like`.

Import `BaseEntity` from `./user`, `Genre`, `Band`, `SocialLinks` from `./band`, `Venue`, `Coordinates` from `./venue`.

- [ ] **Step 4: Create `types/ticket.ts`**

Move these types: `TicketStatus`, `EventCheckinAccessRole`, `EventTicketScanResultStatus`, `EventTicket`, `MyEventTicketPayload`, `EventCheckinStaff`, `EventCheckinAssignableUser`, `EventTicketScanResult`.

Import `BaseEntity` from `./user`, `TicketStatus` is defined here.

- [ ] **Step 5: Create `types/notification.ts`**

Move these types: `NotificationType`, `Notification`.

Import `BaseEntity` from `./user`.

- [ ] **Step 6: Create `types/venue.ts`**

Move these types: `Coordinates`, `Venue`, `OpenDateStatus`, `ApplicationStatus`, `OpenDate`, `Application`.

Import `BaseEntity` from `./user`, `Genre` from `./band`.

- [ ] **Step 7: Create `types/message.ts`**

Move these types: `Conversation`, `Message`.

Import `BaseEntity` from `./user`.

- [ ] **Step 8: Replace `types/index.ts` with barrel re-exports**

```typescript
export * from "./user";
export * from "./band";
export * from "./event";
export * from "./ticket";
export * from "./notification";
export * from "./venue";
export * from "./message";
```

- [ ] **Step 9: Verify no breaking changes**

```bash
pnpm typecheck
```

- [ ] **Step 10: Commit**

```bash
git add packages/shared/src/types/
git commit -m "Split shared types into domain-specific files"
```

---

### Task 3: Split `packages/shared/src/utils/index.ts` by Purpose

**Files:**
- Create: `packages/shared/src/utils/formatting.ts`
- Create: `packages/shared/src/utils/geo.ts`
- Create: `packages/shared/src/utils/collections.ts`
- Create: `packages/shared/src/utils/calendar.ts`
- Create: `packages/shared/src/utils/validation.ts`
- Modify: `packages/shared/src/utils/index.ts` (replace with barrel re-exports)

The current `utils/index.ts` is 735 lines. Split by purpose.

- [ ] **Step 1: Create `utils/geo.ts`**

Move: `calculateDistance`, `toRad` (private helper), `normalizeUsLocation` (private), `normalizeUsStateSegment` (private), `US_STATE_ABBREVIATIONS`, `US_COUNTRY_SUFFIX_REGEX`, `normalizeProfileLocation`, `hasRequiredProfileLocation`, `getProfileLocationValidationError`.

- [ ] **Step 2: Create `utils/formatting.ts`**

Move: `pluralize`, `truncate`, `formatNumber`, `getInitials`, `cn`.

- [ ] **Step 3: Create `utils/collections.ts`**

Move: `groupBy`, `sortByDate`.

- [ ] **Step 4: Create `utils/calendar.ts`**

Move: `CalendarEventInput`, `ResolvedCalendarEvent`, `DEFAULT_CALENDAR_EVENT_DURATION_MINUTES`, `resolveCalendarEvent`, `buildGoogleCalendarUrl`, `buildCalendarIcs`, and their private helpers (`normalizeCalendarText`, `formatCalendarUtcTimestamp`, `escapeIcsText`).

- [ ] **Step 5: Create `utils/validation.ts`**

Move: `isValidEmail`, `isValidUrl`, `normalizePersonalNamePart`, `hasRequiredPersonalName`, `composePersonalName`, `splitPersonalName`, `hasRequiredFullPersonalName`, `getPersonalNameValidationError`.

Also move: `clamp`, `generateId`, `debounce`, `throttle`, `isToday`, `isThisWeek` — general-purpose utilities that fit nowhere else. These can go into a `utils/helpers.ts` file, or stay in validation.ts alongside the other small utilities. Use your judgment — if validation.ts would be confusing, create `utils/helpers.ts`.

- [ ] **Step 6: Replace `utils/index.ts` with barrel re-exports**

```typescript
export * from "./geo";
export * from "./formatting";
export * from "./collections";
export * from "./calendar";
export * from "./validation";
export * from "./helpers"; // if created
```

- [ ] **Step 7: Verify no breaking changes**

```bash
pnpm typecheck
```

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/utils/
git commit -m "Split shared utils into purpose-specific files"
```

---

### Task 4: Split `convex/events.ts` into Three Files

This is the most complex task. `events.ts` (3,285 lines) splits into:

| New File | Exported Functions |
|---|---|
| `events.ts` | `listUpcoming`, `listByGenre`, `getById`, `listByBand`, `listPublicPastByBand`, `listByVenue`, `search`, `listNearby`, `create`, `createWithVenue`, `generateImageUploadUrl`, `updateWithVenue`, `deleteTentative` |
| `eventRsvps.ts` | `rsvp`, `submitEventPollResponse`, `toggleLike`, `getUserRsvps`, `getUserPastRsvps`, `getUserLikes`, `getUserEventStatus`, `getEventGuestListSummary`, `listEventGuests`, `setEventGuestAttendance`, `removeEventGuestRsvp` |
| `eventTickets.ts` | `getMyEventTicket`, `ensureMyEventTicket`, `getEventCheckinAccess`, `listEventCheckinStaff`, `searchAssignableEventCheckinUsers`, `assignEventCheckinStaff`, `assignEventCheckinStaffByEmail`, `removeEventCheckinStaff`, `scanEventTicket` |

**Files:**
- Modify: `convex/events.ts` — keep core CRUD + listing queries, export shared helpers
- Create: `convex/eventRsvps.ts` — RSVP/like/guest-list/poll functions
- Create: `convex/eventTickets.ts` — ticket lifecycle + check-in staff + scanning

**Shared helpers** that must be exported from `events.ts` for use by the other two files:

```typescript
// These are NOT Convex API endpoints — they're regular TypeScript exports.
// Convex only registers `query()`, `mutation()`, etc. as API endpoints.
export {
  // Types
  type ViewerContext,
  type EventBandAccess,
  type EventCheckinAccess,
  type GuestRsvpType,
  type EventTicketStatus,
  type EventTicketScanStatus,
  type EventCheckinRole,
  type PublicEvent,
  type GenreValue,
  // Validators
  genreValidator,
  eventStatusValidator,
  eventAddressVisibilityValidator,
  eventPollValidator,
  guestFilterTypeValidator,
  // Constants
  MASKED_VENUE_ADDRESS,
  GUEST_LIST_PREVIEW_LIMIT,
  GUEST_LIST_CAP,
  TICKET_QR_PREFIX,
  CHECKIN_STAFF_REVOKE_REASON,
  RSVP_CANCEL_REVOKE_REASON,
  GUEST_REMOVED_REVOKE_REASON,
  MAX_EVENT_POLL_OPTIONS,
  // Helper functions
  isPublicEvent,
  buildViewerContext,
  applyAddressMask,
  resolveEventBandAccess,
  resolveEventCheckinAccess,
  getAttendanceStatus,
  decrementShowsAttended,
  incrementShowsAttended,
  canAnswerEventPoll,
  buildPollPromptPayload,
  getEventPollResponses,
  areEventPollsEqual,
};
```

- [ ] **Step 1: Create `convex/eventRsvps.ts`**

Move these exported functions from `events.ts`:
- `rsvp` (line 1467)
- `submitEventPollResponse` (line 1534)
- `toggleLike` (line 1615)
- `getUserRsvps` (line 1743)
- `getUserPastRsvps` (line 1765)
- `getUserLikes` (line 1787)
- `getUserEventStatus` (line 1813)
- `getEventGuestListSummary` (line 2316)
- `listEventGuests` (line 2364)
- `setEventGuestAttendance` (line 2453)
- `removeEventGuestRsvp` (line 2508)

Import shared helpers from `./events` and ticket helpers from `./eventTickets`.

```typescript
import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  isPublicEvent,
  resolveEventBandAccess,
  getAttendanceStatus,
  decrementShowsAttended,
  incrementShowsAttended,
  buildPollPromptPayload,
  canAnswerEventPoll,
  guestFilterTypeValidator,
  GUEST_LIST_PREVIEW_LIMIT,
  GUEST_LIST_CAP,
  RSVP_CANCEL_REVOKE_REASON,
  GUEST_REMOVED_REVOKE_REASON,
} from "./events";
import {
  createTicketForRsvp,
  revokeActiveTicketForRsvp,
} from "./eventTickets";
import {
  getAuthenticatedUserOrNull,
  requireAuthenticatedUser,
} from "./utils/permissions";
```

- [ ] **Step 2: Create `convex/eventTickets.ts`**

Move these exported functions from `events.ts`:
- `getMyEventTicket` (line 1867)
- `ensureMyEventTicket` (line 1931)
- `getEventCheckinAccess` (line 1964)
- `listEventCheckinStaff` (line 1989)
- `searchAssignableEventCheckinUsers` (line 2034)
- `assignEventCheckinStaff` (line 2108)
- `assignEventCheckinStaffByEmail` (line 2172)
- `removeEventCheckinStaff` (line 2189)
- `scanEventTicket` (line 2233)

Also move the private ticket helpers:
- `generateTicketTokenCandidate` (line 353)
- `generateUniqueTicketToken` (line 365)
- `findTicketByRsvpId` (line 381)
- `createTicketForRsvp` (line 391) — **export this** for use by eventRsvps.ts
- `ensureTicketForRsvp` (line 411)
- `revokeActiveTicketForRsvp` (line 428) — **export this** for use by eventRsvps.ts
- `markTicketUsedForRsvp` (line 445)
- `buildTicketQrValue` (line 330)
- `parseTicketQrValue` (line 334)
- `formatTicketCode` (line 349)

```typescript
import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  isPublicEvent,
  resolveEventBandAccess,
  resolveEventCheckinAccess,
  getAttendanceStatus,
  incrementShowsAttended,
  TICKET_QR_PREFIX,
  CHECKIN_STAFF_REVOKE_REASON,
} from "./events";
import {
  getAuthenticatedUserOrNull,
  requireAuthenticatedUser,
  requireBandRole,
} from "./utils/permissions";
import { getParticipatingBandIdsForEvent } from "./eventCohosts";
```

- [ ] **Step 3: Update `events.ts`**

Remove the moved functions and their private helpers. Export the shared helpers listed above (add `export` keyword to the functions/types/constants that are currently private but needed by eventRsvps.ts and eventTickets.ts).

- [ ] **Step 4: Verify Convex compiles**

```bash
npx convex typecheck
```

- [ ] **Step 5: Commit (Convex split only, before app updates)**

```bash
git add convex/events.ts convex/eventRsvps.ts convex/eventTickets.ts
git commit -m "Split events.ts into events, eventRsvps, and eventTickets"
```

---

### Task 5: Update Web App Imports for Events Split

The Convex API paths change when functions move files:
- `api.events.rsvp` → `api.eventRsvps.rsvp`
- `api.events.getMyEventTicket` → `api.eventTickets.getMyEventTicket`
- etc.

**Files to update:**
- `apps/web/src/hooks/useEvents.ts` — main file, most references
- `apps/web/src/hooks/useSharedEvents.ts` — create/update/delete (stays in `api.events.*`)
- `apps/web/src/hooks/useBand.ts` — `api.events.listByBand` (stays)
- `apps/web/src/components/fan/CalendarView.tsx` — `api.events.getUserRsvps/getUserLikes/getUserPastRsvps`
- `apps/web/src/app/(app)/bands/[id]/page.tsx` — `api.events.listPublicPastByBand` (stays)
- `apps/web/src/app/(app)/gig/[id]/check-in/page.tsx` — `api.events.scanEventTicket`
- `apps/web/src/components/band/BandCalendar.tsx` — `api.events.listByBand` (stays)
- `apps/web/src/components/band/BandDashboard.tsx` — `api.events.listByBand` (stays)

**API path mapping for moved functions:**

| Old | New |
|---|---|
| `api.events.rsvp` | `api.eventRsvps.rsvp` |
| `api.events.submitEventPollResponse` | `api.eventRsvps.submitEventPollResponse` |
| `api.events.toggleLike` | `api.eventRsvps.toggleLike` |
| `api.events.getUserRsvps` | `api.eventRsvps.getUserRsvps` |
| `api.events.getUserPastRsvps` | `api.eventRsvps.getUserPastRsvps` |
| `api.events.getUserLikes` | `api.eventRsvps.getUserLikes` |
| `api.events.getUserEventStatus` | `api.eventRsvps.getUserEventStatus` |
| `api.events.getEventGuestListSummary` | `api.eventRsvps.getEventGuestListSummary` |
| `api.events.listEventGuests` | `api.eventRsvps.listEventGuests` |
| `api.events.setEventGuestAttendance` | `api.eventRsvps.setEventGuestAttendance` |
| `api.events.removeEventGuestRsvp` | `api.eventRsvps.removeEventGuestRsvp` |
| `api.events.getMyEventTicket` | `api.eventTickets.getMyEventTicket` |
| `api.events.ensureMyEventTicket` | `api.eventTickets.ensureMyEventTicket` |
| `api.events.getEventCheckinAccess` | `api.eventTickets.getEventCheckinAccess` |
| `api.events.listEventCheckinStaff` | `api.eventTickets.listEventCheckinStaff` |
| `api.events.searchAssignableEventCheckinUsers` | `api.eventTickets.searchAssignableEventCheckinUsers` |
| `api.events.assignEventCheckinStaff` | `api.eventTickets.assignEventCheckinStaff` |
| `api.events.removeEventCheckinStaff` | `api.eventTickets.removeEventCheckinStaff` |
| `api.events.scanEventTicket` | `api.eventTickets.scanEventTicket` |

- [ ] **Step 1: Update `apps/web/src/hooks/useEvents.ts`**

Add imports for the new API modules at the top of the file. The Convex `api` object auto-generates from file names, so add `api.eventRsvps` and `api.eventTickets` references. Apply the mapping table above to all `api.events.*` references that moved.

- [ ] **Step 2: Update remaining web files**

Apply the same mapping to:
- `apps/web/src/components/fan/CalendarView.tsx` — RSVP queries → `api.eventRsvps.*`
- `apps/web/src/app/(app)/gig/[id]/check-in/page.tsx` — `scanEventTicket` → `api.eventTickets.scanEventTicket`

Files that only use core event functions (`listByBand`, `listUpcoming`, `listPublicPastByBand`, etc.) need NO changes: `useSharedEvents.ts`, `useBand.ts`, `bands/[id]/page.tsx`, `BandCalendar.tsx`, `BandDashboard.tsx`.

- [ ] **Step 3: Verify web build**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/
git commit -m "Update web app imports for events file split"
```

---

### Task 6: Update Mobile App Imports for Events Split

**Files to update:**
- `apps/mobile/src/hooks/useEvents.ts` — most references
- `apps/mobile/src/hooks/useSharedEvents.ts` — create/update/delete (stays)
- `apps/mobile/src/hooks/useBand.ts` — `api.events.listByBand` (stays)
- `apps/mobile/src/components/events/EventListItem.tsx` — RSVP/like references

Apply the exact same mapping table from Task 5.

- [ ] **Step 1: Update `apps/mobile/src/hooks/useEvents.ts`**

Apply the API path mapping table to all moved function references.

- [ ] **Step 2: Update `apps/mobile/src/components/events/EventListItem.tsx`**

Change `api.events.getUserEventStatus` → `api.eventRsvps.getUserEventStatus`, `api.events.rsvp` → `api.eventRsvps.rsvp`, `api.events.toggleLike` → `api.eventRsvps.toggleLike`.

- [ ] **Step 3: Verify mobile typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/
git commit -m "Update mobile app imports for events file split"
```

---

### Task 7: Split `convex/bands.ts` into Two Files

`bands.ts` (1,414 lines) splits into:

| File | Exported Functions |
|---|---|
| `bands.ts` | `getById`, `getPublicBandProfile`, `trackProfileView`, `getCurrentUserBand`, `listMyBands`, `getBandWithStats`, `create`, `update`, `generateImageUploadUrl`, `setImageFromStorage`, `clearImage`, `deleteBand`, `list`, `search`, `toggleSave`, `getSavedBands` |
| `bandAnalytics.ts` | `getAnalytics` |

**Files:**
- Modify: `convex/bands.ts` — export shared helpers needed by analytics
- Create: `convex/bandAnalytics.ts` — the `getAnalytics` query

- [ ] **Step 1: Create `convex/bandAnalytics.ts`**

Move `getAnalytics` (line 1105-1414) plus the private helpers it depends on:
- `listBandParticipatingEvents` (line 132)
- `buildPollAnalyticsForEvent` (line 163)
- `normalizeAudienceLocation` (line 120)

These helpers are only used by `getAnalytics`, so they move entirely.

```typescript
import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { requireBandMember } from "./utils/permissions";
import { normalizeUsLocation } from "./utils/location";
```

- [ ] **Step 2: Update `bands.ts`**

Remove `getAnalytics`, `listBandParticipatingEvents`, `buildPollAnalyticsForEvent`, and `normalizeAudienceLocation` from bands.ts.

- [ ] **Step 3: Update app imports**

API path changes: `api.bands.getAnalytics` → `api.bandAnalytics.getAnalytics`

Files to update:
- `apps/web/src/hooks/useBand.ts` (line 102)
- `apps/mobile/src/hooks/useBand.ts` (line 26)

- [ ] **Step 4: Verify build**

```bash
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add convex/bands.ts convex/bandAnalytics.ts apps/web/src/hooks/useBand.ts apps/mobile/src/hooks/useBand.ts
git commit -m "Extract band analytics into dedicated Convex file"
```

---

### Task 8: Archive Completed Migrations

**Files:**
- Create: `convex/_archive/migrations-v1.ts`
- Modify: `convex/migrations.ts`

All four migration groups (`backfillEventTicketsBatch`, `backfillBandWorkspaceBatch`, `backfillUserPhonesFromClerkBatch`, `repairStorageBackedMediaUrls`) and their validators appear to be completed migrations.

- [ ] **Step 1: Create archive directory and move migrations**

```bash
mkdir -p convex/_archive
```

Move the entire content of `convex/migrations.ts` into `convex/_archive/migrations-v1.ts`. This preserves the code for reference while removing it from the active codebase.

Important: Convex will try to deploy any `.ts` file in the `convex/` directory. Files in `_archive/` with an underscore prefix will be excluded from Convex deployment by convention. Verify this by checking Convex docs — if `_archive/` is not excluded, rename to `convex/_archive/` (underscore prefix directories are excluded by Convex).

- [ ] **Step 2: Remove or empty `convex/migrations.ts`**

If all migrations are complete, delete the file. If you want to keep it as a placeholder for future migrations:

```typescript
/**
 * Migration functions. Completed migrations are archived in _archive/migrations-v1.ts.
 */
```

- [ ] **Step 3: Verify Convex compiles**

```bash
npx convex typecheck
```

- [ ] **Step 4: Commit**

```bash
git add convex/
git commit -m "Archive completed migrations to _archive directory"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Full typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 2: Lint**

```bash
pnpm lint
```

- [ ] **Step 3: Build web**

```bash
pnpm build:web
```

- [ ] **Step 4: Verify no stale API references**

```bash
# Should return 0 results for moved functions still using old paths
grep -r "api\.events\.rsvp\b" apps/ --include="*.ts" --include="*.tsx"
grep -r "api\.events\.getMyEventTicket" apps/ --include="*.ts" --include="*.tsx"
grep -r "api\.events\.scanEventTicket" apps/ --include="*.ts" --include="*.tsx"
grep -r "api\.bands\.getAnalytics" apps/ --include="*.ts" --include="*.tsx"
```

All four should return no results.

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "Fix any remaining issues from repo organization"
```
